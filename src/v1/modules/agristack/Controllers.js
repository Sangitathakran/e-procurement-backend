const {
  StateDistrictCity,
} = require("@src/v1/models/master/StateDistrictCity");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const {
  AgristackLog,
} = require("@src/v1/models/app/farmerDetails/AgristackLogs");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { default: axios } = require("axios");
const { v4: uuidv4 } = require("uuid");
const {
  FarmerAgristackMap,
} = require("@src/v1/models/app/farmerDetails/FarmerAgristackMap");
const { agristackLogger } = require("@config/logger");

const {
  SENDER_ID,
  SENDER_URI,
  RECEIVER_ID,
  TOKEN_URL,
} = require("./agristack.json");
const { getCache, setCache } = require("@src/v1/utils/cache");

const stateInfo = require("./agristack.json").states.find(
  (obj) => obj.state_lgd_code === "9"
);
const AGRISTACK_URL = stateInfo.url;
const AUTH_TOKEN = "";
const STATE_ID = new mongoose.Types.ObjectId(stateInfo.state_id);
const STATE_LGD_CODE = stateInfo.state_lgd_code;

module.exports.postSeekData = async (req, res) => {
  try {
    const data = req.body;
    //await AgristackLog.create({ responseData: data, farmerData: data?.message?.search_response?.[0]?.data?.reg_records?.farmerData });
    await AgristackLog.updateOne(
      { correlation_id: data?.message?.correlation_id },
      {
        $set: {
          responseData: data,
          farmerData:
            data?.message?.search_response?.[0]?.data?.reg_records?.farmerData,
          land_data:
            data?.message?.search_response?.[0]?.data?.reg_records?.land_data,
          crop_sown_data:
            data?.message?.search_response?.[0]?.data?.reg_records
              ?.crop_sown_data,
        },
      }
    );
    return res.status(200).send({ success: true, message: "OK" });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.findStateById = async (req, res) => {
  const { input_id } = req.query;
  try {
    // Fetch the document (only one is expected)
    const data = await StateDistrictCity.findOne({}, { states: 1 }).lean();

    if (!data) {
      return null;
    }

    // Find the state with the given _id
    const state = data.states.find(
      (state) => state._id.toString() === input_id.toString()
    );

    return res.json({
      success: true,
      message: "OK",
      data: { state: state?.state_title },
    });
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.getAgristackFarmersData = async (req, res) => {
  const limit = 100;
  let skip = 0;
  let totalProcessed = 0;

  try {
    while (totalProcessed < 100) {
      const farmers = await farmer
        .find({
          "proof.aadhar_no": { $exists: true, $ne: null },
          "address.state_id": STATE_ID,
        })
        .skip(skip)
        .limit(limit)
        .select("proof.aadhar_no");

      if (!farmers.length) break;

      for (const farmer of farmers) {
        const aadhaar = scientificToString(farmer.proof.aadhar_no).toString();
        const hashed = sha256Hash(aadhaar);
        const { correlationId, payload, type } = await callAgriStackAPI(hashed);
      //  console.log({ hashed, aadhaar, adhar_no: farmer.proof.aadhar_no });

        if (correlationId) {
          await AgristackLog.create({
            correlation_id: correlationId,
            farmer_id: farmer._id,
            payload: payload,
            type: type
          });
        }
      }

      totalProcessed += farmers.length;
      skip += limit;
      const logEntry = `${new Date().toISOString()} - Processed batch - skip=${skip} totalProcessed=${totalProcessed}\n`;

      agristackLogger.info(logEntry);
    }

    return res.json({ message: "Sync completed", totalProcessed });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ***********************************  HELPER FUNCTIONS ********************************************

async function callAgriStackAPI(aadhaarHash) {
  const transactionId = uuidv4();
  const timestamp = new Date().toISOString();

  const payload = {
    requestToken: "",
    signature: "signature string",
    header: {
      version: "0.1.0",
      message_id: transactionId,
      message_ts: timestamp,
      sender_id: "edcb446e-3f86-419d-a07d-026554592a97",
      sender_uri:
        "https://api.testing.admin.khetisauda.com/farmer-registry-api-up-qa/agristack/v1/api/central/seekerOnSeek",
      receiver_id: "ed5288ce-aada-4fd9-b929-0062a08207c4",
      total_count: 1,
      is_msg_encrypted: false,
    },
    message: {
      transaction_id: transactionId,
      search_request: [
        {
          reference_id: transactionId,
          timestamp,
          search_criteria: {
            query_type: "namedQuery",
            reg_type: "agristack_farmer",
            query: {
              query_name: "fn_agristack_v0_fn_get_farmer_data_by_aadhaar_hash",
              mapper_id: "i1002:o1001",
              query_params: [
                {
                  aadhaar_hash: aadhaarHash,
                  aadhaar_type: "P",
                  state_lgd_code: STATE_LGD_CODE,
                },
              ],
            },
            sort: [
              {
                attribute_name: "string",
                sort_order: "asc",
              },
            ],
            pagination: {
              page_size: 2000,
              page_number: 1,
            },
            consent: {
              consent_required: false,
              consent_artifact: {},
            },
          },
          locale: "en",
        },
      ],
    },
  };

  try {
    const response = await axios.post(AGRISTACK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    agristackLogger.info({ request: payload, response: response.data });

    return { correlationId: response?.data?.message?.correlationId, payload, type: "farmerDataByHashedAdhar" };
  } catch (error) {
    console.error("AgriStack API error", error);
    return { correlationId: null };
  }
}

async function callAgriStackAPIByFarmerId({
  farmer_id,
  aadhaar_type,
  state_lgd_code,
}) {
  const transactionId = uuidv4();
  const timestamp = new Date().toISOString();

  const payload = {
    requestToken: "",
    signature: "signature string",
    header: {
      version: "0.1.0",
      message_id: transactionId,
      message_ts: timestamp,
      sender_id: SENDER_ID,
      sender_uri: SENDER_URI,
      receiver_id: RECEIVER_ID,
      total_count: 1,
      is_msg_encrypted: false,
    },
    message: {
      transaction_id: transactionId,
      search_request: [
        {
          reference_id: transactionId,
          timestamp,
          search_criteria: {
            query_type: "namedQuery",
            reg_type: "agristack_farmer",
            query: {
              query_name: "fn_agristack_v0_fn_get_farmer_data_by_aadhaar_hash", // need to update
              mapper_id: "i1001:o1001",
              query_params: [
                {
                  farmer_id,
                  aadhaar_type: "P",
                  state_lgd_code,
                },
              ],
            },
            sort: [
              {
                attribute_name: "string",
                sort_order: "asc",
              },
            ],
            pagination: {
              page_size: 2000,
              page_number: 1,
            },
            consent: {
              consent_required: false,
              consent_artifact: {},
            },
          },
          locale: "en",
        },
      ],
    },
  };

  const response = await axios.post(AGRISTACK_URL, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = response.data?.message;

  if (result?.ack_status === "ACK" && result?.correlation_id) {
    return {
      correlationId: result.correlation_id,
      timestamp: result.timestamp,
    };
  }

  throw new Error(
    `API response error: ${result?.error?.message || "Unknown error"}`
  );
}

// Helper: Convert scientific notation to full numeric string
function scientificToString(num) {
  const number = Number(num);
  if (isNaN(number)) throw new Error("Invalid Aadhaar format");
  return number.toFixed(0); // removes exponent part
}

// Helper: SHA256 hash
function sha256Hash(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

async function getAuthToken() {
  const cacheKey = "AGRISTACK_AUTH_TOKEN";
  const cachedToken = getCache(cacheKey);

  if (cachedToken) {
    return cachedToken;
  }

  const payload = new URLSearchParams();
  payload.append("client_id", "registry-frontend");
  payload.append("username", process.env.AGRISTACK_USERNAME);
  payload.append("password", process.env.AGRISTACK_PASSWORD);
  payload.append("grant_type", "password");

  try {
    const response = await axios.post(TOKEN_URL, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      throw new Error("No access token returned.");
    }

    const ttl = 43200;

    setCache(cacheKey, access_token, ttl); // Store token with TTL (in seconds)
    return access_token;
  } catch (err) {
    console.error("Failed to fetch access token:", err.message);
    throw err;
  }
}
