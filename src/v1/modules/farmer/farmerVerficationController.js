const { dumpJSONToExcel, } = require("@src/v1/utils/helpers");
const { sendResponse, } = require("@src/v1/utils/helpers/api_response");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { aadherVerfiycation, bankVerfiycation } = require('@src/common/services/ongridVerfication');
const { setCache, getCache } = require("@src/v1/utils/cache");
const parseExcelOrCsvFile = require('@src/common/services/parseExcelOrCsvFile');
const { verfiyfarmer } = require('@src/v1/models/app/farmerDetails/verfiyFarmer');
const logger = require('@common/logger/logger');
const { VerificationType } = require('@common/enum');
const { paginate } = require('@src/v1/utils/helpers');
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

function generateCacheKey(prefix, params) {
  return `${prefix}:${Object.entries(params)
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;
}

async function mapToVerifyFarmerModel(rows, request_for_verfication) {
  const result = [];
  let request_for_aadhaar = false
  let request_for_bank = false

  switch (request_for_verfication) {
    case VerificationType.BANK:
      request_for_bank = true;
      break;
    case VerificationType.AADHAAR:
      request_for_aadhaar = true;
      break;
    case VerificationType.BOTH:
      request_for_bank = true;
      request_for_aadhaar = true;
      break;
  }

  for (const row of rows) {
    try {
      const farmerData = await farmer.findOne({ farmer_id: row["Farmer ID"] });
      if (!farmerData) {
        logger.warn(`Farmer not found with ID: ${row._id}`);
        continue;
      }

      const existingVerification = await verfiyfarmer.findOne({ farmer_id: farmerData._id });
      if (existingVerification) {
        logger.info(`Farmer already verified with ID: ${farmerData._id}`);
        continue;
      } else {
        const data = {
          farmer_id: new ObjectId(farmerData._id),
          associate_id: farmerData?.associate_id ? new ObjectId(farmerData.associate_id) : null,
          aadhar_number: farmerData?.proof?.aadhar_no || null,
          request_for_aadhaar,
          request_for_bank
        };

        result.push(data);
      }

    } catch (err) {
      logger.error(`Error processing row with ID ${row._id}`, err);
      continue;
    }
  }

  return result;
}



module.exports.uploadFarmerForVerfication = async (req, res) => {
  try {
    let { isxlsx, request_for_verfication } = req.body;
    const [file] = req.files;
    request_for_verfication = +request_for_verfication
    logger.info("Starting upload of farmer data for verification.");

    // Check for required fields
    if (!file) {
      logger.warn("File is missing in the request.");
      return sendResponse({
        res,
        status: 400,
        message: "File is required"
      });
    }

    // Check if isxlsx is provided
    if (typeof isxlsx === "undefined") {
      logger.warn("Missing required field: isxlsx");
      return sendResponse({
        res,
        status: 400,
        message: "Missing required field: isxlsx"
      });
    }
    if (!Object.values(VerificationType).includes(request_for_verfication)) {
      logger.warn("Invalid or missing request_for_verfication value", { request_for_verfication });

      return sendResponse({
        res,
        status: 400,
        message: "Invalid or missing value: request_for_verfication"
      });
    }


    const rawRows = await parseExcelOrCsvFile(file, parseInt(isxlsx));
    if (!rawRows.length) {
      logger.warn("Uploaded file contains no data.");
      return sendResponse({
        res,
        status: 400,
        message: "No data found in file"
      });
    }

    const formattedRows = await mapToVerifyFarmerModel(rawRows, request_for_verfication);
    await verfiyfarmer.insertMany(formattedRows);

    logger.info(`Imported ${formattedRows.length} farmer records successfully.`);

    return sendResponse({
      res,
      message: "Farmers imported successfully",
      data: { count: formattedRows.length }
    });
  } catch (error) {
    logger.error("Error during farmer data import", error);
    return sendResponse({
      res,
      status: 500,
      message: "Failed to import data",
      errors: error.message
    });
  }
};


module.exports.requestforVerification = async (req, res) => {
  try {
    let { farmerId, request_for_verfication } = req.body;
    request_for_verfication = +request_for_verfication;

    logger.info("Starting farmer verification", { farmerId, request_for_verfication });

    if (!Object.values(VerificationType).includes(request_for_verfication)) {
      return sendResponse({
        res,
        status: 400,
        message: "Invalid or missing value: request_for_verfication",
      });
    }

    if (!farmerId) {
      return sendResponse({
        res,
        status: 400,
        message: "Missing or invalid farmerId",
      });
    }

    const findFarmer = await farmer.findOne({ farmer_id: farmerId });
    if (!findFarmer) {
      return sendResponse({
        res,
        status: 404,
        message: `Farmer not found with ID: ${farmerId}`,
      });
    }

    // Aadhaar Verification
    if (request_for_verfication == VerificationType.AADHAAR) {

      if (findFarmer?.proof?.aadhar_no && findFarmer?.proof?.is_verified === false) {
        const aadhaarNo = findFarmer?.proof?.aadhar_no;
        const aadherRes = await aadherVerfiycation(aadhaarNo);

        logger.info(`Aadhaar API response for ${findFarmer.farmer_id}: ${JSON.stringify(aadherRes)}`);

        const timestamp = new Date(aadherRes?.timestamp || Date.now());
        const aadherData = aadherRes?.data?.aadhaar_data;

        const aadhaarVerified = aadherRes?.data?.code === "1018";
        console.log({
              aadhaar_details: {
                code: aadherRes?.data?.code,
                ...aadherData,
                request_id: aadherRes?.request_id,
                transaction_id: aadherRes?.transaction_id,
              },
              is_verify_aadhaar: aadhaarVerified,
              is_verify_aadhaar_date: timestamp,
              request_for_aadhaar: false,
            })
        await verfiyfarmer.updateOne(
          { farmer_id: findFarmer._id },
          {
            $set: {
              aadhaar_details: {
                code: aadherRes?.data?.code,
                ...aadherData,
                request_id: aadherRes?.request_id,
                transaction_id: aadherRes?.transaction_id,
              },
              is_verify_aadhaar: aadhaarVerified,
              is_verify_aadhaar_date: timestamp,
              request_for_aadhaar: false,
            },
          },
          { upsert: true }
        );

        await farmer.findByIdAndUpdate({_id:findFarmer._id}, {
          $set: {
            "proof.is_verified": aadhaarVerified,
            "proof.is_verify_aadhaar_date": timestamp,
          },
        });

        logger.info(`Aadhaar verification ${aadhaarVerified ? ' success' : ' failed'} for ${findFarmer.farmer_id}`);
      }else{
        logger.warn(`Aadhaar number missing or already verified for farmer ${findFarmer?.proof?.aadhar_no},${findFarmer?.proof?.is_verified}`);
        logger.warn(`Aadhaar number missing or already verified for farmer ${findFarmer.farmer_id}`);
        // If aadhaar number is missing or already verified, return an error response
        return sendResponse({
          res,
          status: 400,
          message: "Aadhaar number missing or already verified",
        });
      }
    }

    // Bank Verification
    if (request_for_verfication === VerificationType.BANK) {
      if (findFarmer?.bank_details?.account_no && findFarmer?.bank_details?.ifsc_code && findFarmer?.bank_details?.is_verified === false) {
        const { account_no, ifsc_code } = findFarmer.bank_details;
        const bankRes = await bankVerfiycation(account_no, ifsc_code);

        logger.info(`Bank API response for ${findFarmer.farmer_id}: ${JSON.stringify(bankRes)}`);

        const timestamp = new Date(bankRes?.timestamp || Date.now());
        const isVerified = bankRes?.data?.code === "1000";
        const bankData = bankRes?.data?.bank_account_data || {};

        await verfiyfarmer.updateOne(
          { farmer_id: findFarmer._id },
          {
            $set: {
              bank_details: {
                name: bankData?.name,
                code: bankRes?.data?.code,
                bank_name: bankData?.bank_name,
                branch: bankData?.branch,
                account_number: bankData?.account_number,
                ifsc: ifsc_code,
                verified_at: timestamp,
                request_id: bankRes?.request_id,
                transaction_id: bankRes?.transaction_id,
              },
              is_verify_bank: isVerified,
              is_verify_bank_date: timestamp,
              request_for_bank: false,
            },
          },
          { upsert: true }
        );

        await farmer.findByIdAndUpdate(findFarmer._id, {
          $set: {
            "bank_details.is_verified": isVerified,
            "bank_details.is_verify_bank_date": timestamp,
          },
        });

        logger.info(`Bank verification ${isVerified ? ' success' : ' failed'} for ${findFarmer.farmer_id}`);
      } else {
        logger.warn(`Bank details missing for farmer ${findFarmer.farmer_id}`);
        return sendResponse({
          res,
          status: 400,
          message: "Bank details missing or already verified",
        });
      }
    }

    return sendResponse({
      res,
      status: 200,
      data: { farmerId },
      message: "Verification process completed",
    });

  } catch (error) {
    logger.error("Error during farmer verification", error);
    return sendResponse({
      res,
      status: 500,
      message: "Something went wrong during verification",
      errors: error.message,
    });
  }
};




module.exports.farmerCount = async (req, res) => {
  try {
    logger.info(" Fetching farmer count and verification statistics");

    // Aggregate farmer types and counts
    const farmerTypeAgg = farmer.aggregate([
      {
        $group: {
          _id: "$farmer_type",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          data: {
            $push: {
              type: "$_id",
              count: "$count"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalFarmers: "$total",
          individualFarmers: {
            $ifNull: [
              {
                $let: {
                  vars: {
                    match: {
                      $first: {
                        $filter: {
                          input: "$data",
                          as: "item",
                          cond: { $eq: ["$$item.type", "Individual"] }
                        }
                      }
                    }
                  },
                  in: "$$match.count"
                }
              },
              0
            ]
          },
          associateFarmers: {
            $ifNull: [
              {
                $let: {
                  vars: {
                    match: {
                      $first: {
                        $filter: {
                          input: "$data",
                          as: "item",
                          cond: { $eq: ["$$item.type", "Associate"] }
                        }
                      }
                    }
                  },
                  in: "$$match.count"
                }
              },
              0
            ]
          }
        }
      }
    ]).exec();

    // Aggregate verified farmers count
    const verifiedFarmerAgg = farmer.aggregate([
      {
        $facet: {
          bankVerified: [
            { $match: { "bank_details.is_verified": true } },
            { $count: "count" }
          ],
          aadhaarVerified: [
            { $match: { "proof.is_verified": true } },
            { $count: "count" }
          ],
          bothVerified: [
            {
              $match: {
                "bank_details.is_verified": true,
                "proof.is_verified": true
              }
            },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          bankVerified: {
            $ifNull: [{ $arrayElemAt: ["$bankVerified.count", 0] }, 0]
          },
          aadhaarVerified: {
            $ifNull: [{ $arrayElemAt: ["$aadhaarVerified.count", 0] }, 0]
          },
          bothVerified: {
            $ifNull: [{ $arrayElemAt: ["$bothVerified.count", 0] }, 0]
          }
        }
      }
    ]).exec();

    const [farmerTypes, verifiedFarmers] = await Promise.all([
      farmerTypeAgg,
      verifiedFarmerAgg
    ]);

    logger.info("✅ Farmer statistics fetched successfully");

    return sendResponse({
      res,
      message: "Farmer count fetched successfully",
      data: {
        farmerTypes: farmerTypes[0] || {
          totalFarmers: 0,
          individualFarmers: 0,
          associateFarmers: 0
        },
        verifiedFarmers: verifiedFarmers[0] || {
          bankVerified: 0,
          aadhaarVerified: 0,
          bothVerified: 0
        }
      }
    });

  } catch (error) {
    logger.error(" Error while fetching farmer count", error);
    return sendResponse({
      res,
      status: 500,
      message: "Failed to fetch farmer count",
      errors: error.message
    });
  }
};


module.exports.farmerVerfiedData = async (req, res) => {
  try {
    logger.info("[farmerVerfiedData] Fetching verified farmers with filters and pagination", {
      query: req.query,
    });

    const {
      page = 1,
      limit = 10,
      search = "",
      state_id,
      associate_id = "",
      commodityName,
      isExport = 1
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const matchStage = {};

    // Unified search across mobile, name, farmer_id
    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { "farmer_details.mobile_no": searchRegex },
        { "farmer_details.farmer_id": searchRegex },
        { "farmer_details.name": searchRegex }
      ];
    }

    if (state_id) {
      matchStage["farmer_details.address.state_id"] = new mongoose.Types.ObjectId(state_id);
    }

    if (commodityName) {
      matchStage["farmer_detailsCrop.crop_name"] = new RegExp(commodityName, "i");
    }

    if (associate_id && mongoose.Types.ObjectId.isValid(associate_id)) {
      matchStage["$or"] = [
        { associate_id: new mongoose.Types.ObjectId(associate_id) },
        { associate_id: null }
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "farmers",
          localField: "farmer_id",
          foreignField: "_id",
          as: "farmer_details"
        }
      },
      { $unwind: "$farmer_details" },
      {
        $lookup: {
          from: "users",
          localField: "associate_id",
          foreignField: "_id",
          as: "associate_details"
        }
      },
      {
        $unwind: {
          path: "$associate_details",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "crops",
          let: { farmerId: "$farmer_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$farmer_id", "$$farmerId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "farmer_detailsCrop"
        }
      },
      {
        $unwind: {
          path: "$farmer_detailsCrop",
          preserveNullAndEmptyArrays: true
        }
      },
      { $match: matchStage },
      {
        $project: {
          _id: 0,
          farmer_id: "$farmer_details.farmer_id",
          commodityName: "$farmer_detailsCrop.crop_name",
          associate_id: 1,
          is_verify_aadhaar: 1,
          is_verify_bank: 1,
          state_id: "$farmer_details.address.state_id",
          name: "$farmer_details.name",
          mobile: "$farmer_details.basic_details.mobile_no",
          address: "$farmer_details.address.address_line_1",
          aadhar_no: "$farmer_details.proof.aadhar_no",
          account_no: "$farmer_details.bank_details.account_no",
          bank_name: "$farmer_details.bank_details.bank_name",
          branch_name: "$farmer_details.bank_details.branch_name",
          ifsc_code: "$farmer_details.bank_details.ifsc_code",
          organization_name: "$associate_details.basic_details.associate_details.organization_name",
          createdAt:1
        }
      },
      {
        $sort: { createdAt: -1 } // Sort by creation date, most recent first
      }
    ];

    if (isExport != 2 && isExport !== "2") {
      pipeline.push({
        $facet: {
          totalCount: [{ $count: "count" }],
          data: [
            { $skip: skip },
            { $limit: parseInt(limit) }
          ]
        }
      });
    }

    logger.info("[farmerVerfiedData] Running aggregation pipeline", {
      matchStage,
      skip,
      limit: parseInt(limit),
      isExport,
    });
    const result = await verfiyfarmer.aggregate(pipeline);
    const count = await verfiyfarmer.countDocuments(); // optional: base count

    let total = 0;
    let data = [];

    if (isExport == 2 || isExport === "2") {
      data = result;
      total = result.length;
    } else {
      total = result[0]?.totalCount[0]?.count || 0;
      // data = result[0]?.data || [];
      data = (result[0]?.data || []).map((item) => ({
        farmer_id: item.farmer_id || "NA",
        name: item.name || "NA",
        mobile: item.mobile || "NA",
        commodityName: item.commodityName || "NA",
        aadhar_no: item.aadhar_no || "NA",
        account_no: item.account_no || "NA",
        bank_name: item.bank_name || "NA",
        branch_name: item.branch_name || "NA",
        ifsc_code: item.ifsc_code || "NA",
        address: item.address || "NA",
        is_verify_aadhaar: item.is_verify_aadhaar,
        is_verify_bank: item.is_verify_bank,
        organization_name: item.organization_name || "NA",
        state_id: item.state_id || "NA",
        associate_id: item.associate_id || "NA",
        createdAt: item.createdAt || "NA"
      }));
    }

    logger.info("[farmerVerfiedData] Aggregation successful", {
      totalResults: total,
      returnedCount: data.length
    });

    // Export to Excel
    if (isExport == 2 || isExport === "2") {
      const exportRows = data.map((item) => ({
        "Farmer ID": item.farmer_id || "NA",
        "Farmer Name": item.name || "NA",
        "Mobile": item.mobile || "NA",
        "Commodity": item.commodityName || "NA",
        "Aadhaar Verified": item.is_verify_aadhaar,
        "Bank Verified": item.is_verify_bank,
        "Aadhaar No": item.aadhar_no || "NA",
        "Account No": item.account_no || "NA",
        "Bank Name": item.bank_name || "NA",
        "Branch Name": item.branch_name || "NA",
        "IFSC Code": item.ifsc_code || "NA",
        "Address": item.address || "NA",
        "Organization": item.organization_name || "NA"
      }));

      if (exportRows.length > 0) {
        return dumpJSONToExcel(req, res, {
          data: exportRows,
          fileName: `Verified_Farmers_${new Date().toISOString().slice(0, 10)}.xlsx`,
          worksheetName: `Farmers`
        });
      } else {
        return sendResponse({
          res,
          status: 200,
          message: "No farmer data found to export"
        });
      }
    }

    return sendResponse({
      res,
      message: "Verified farmers fetched successfully",
      data: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        farmers: data
      }
    });

  } catch (error) {
    logger.error("[farmerVerfiedData] Error fetching verified farmers", error);
    return sendResponse({
      res,
      status: 500,
      message: "Failed to fetch verified farmers",
      errors: error.message
    });
  }
};


