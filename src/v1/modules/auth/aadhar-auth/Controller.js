const {
  _auth_module,
  _response_message,
  _middleware,
  _query,
} = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const { JWT_SECRET_KEY } = require("@config/index");
// const { FeatureList } = require("@src/v1/models/master/FeatureList");
// const { TypesModel } = require("@src/v1/models/master/Types");
// const { _userTypeFrontendRouteMapping } = require("@src/v1/utils/constants");
// const { emailService } = require("@src/v1/utils/third_party/EmailServices");
// const { getPermission } = require("../../user-management/permission");
const { default: axios } = require("axios");
const {
  AADHAR_SERVICE_PROVIDER_KEY,
  AADHAR_SERVICE_PROVIDER,
} = require("@config/index");

module.exports.sendAadharOTP = async (req, res) => {
  try {
    const { uidai_aadharNo } = req.body;
    if (!uidai_aadharNo) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require("Aadhar Number") }],
        })
      );
    }

    const apiUrl = `${AADHAR_SERVICE_PROVIDER}/generate-otp`;
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "X-API-Key": AADHAR_SERVICE_PROVIDER_KEY,
      "X-Auth-Type": "API-Key",
    };

    const payload = {
      aadhaar_number: uidai_aadharNo,
      consent: "Y",
    };

    const response = await axios.post(apiUrl, payload, { headers });
    const { status, error } = response || {};

    if (status != 200 && !response?.data?.transaction_id) {
      return res.status(200).send(
        new serviceResponse({
          status,
          errors: [{ message: { ...error } }],
        })
      );
    }
    // Check for transaction_id in the response
    else if (response?.data?.transaction_id) {
      const { data } = response?.data || {};
      const { transaction_id, code, message: ResponseMsg } = data || {};
      const requiredData = {
        transaction_id,
        status,
        code,
      };
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: ResponseMsg,
          data: requiredData,
        })
      );
    } else if (status === 400) {
    }
  } catch (error) {
    const { status } = error?.response;
    console.log("error========>", error?.response);
    return res.status(200).send(
      new serviceResponse({
        status,
        message: _query.invalid("response from service provider"),
        errors: error?.response?.data?.error?.metadata?.fields ||
          error?.response?.data || {
            message: "Something went wrong, please try again later",
          },
      })
    );
  }
};
module.exports.verifyAadharOTP = async (req, res) => {
  try {
    const { otp, code, transaction_id } = req.body;

    if (!otp) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require("OTP") }],
        })
      );
    }

    const apiUrl = `${AADHAR_SERVICE_PROVIDER}/submit-otp`;
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "X-API-Key": AADHAR_SERVICE_PROVIDER_KEY,
      "X-Auth-Type": "API-Key",
      "X-Transaction-ID": transaction_id,
    };

    const payload = {
      otp,
      share_code: code,
    };

    const response = await axios.post(apiUrl, payload, { headers });
    // console.log("success_response=====>", response?.data);
    const { status, data: fetchedData } = response.data || {};
    // console.log("fetched_data=====>", fetchedData);
    if (status != 200) {
      return res.status(200).send(
        new serviceResponse({
          status: 404,
          message: _query.invalid("response from service provider"),
          data: fetchedData,
        })
      );
    } else if (status == 200 && response?.data) {
      const { aadhaar_data = null } = fetchedData || {};
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: _query.get("Aadhar Details"),
          data: aadhaar_data,
        })
      );
    }
  } catch (error) {
    console.log("catched_error========>", error?.response?.data);
    const { error: { message: responseMessage } = {} } =
      error?.response?.data || {};
    return res.status(200).send(
      new serviceResponse({
        status: 401,
        message:
          responseMessage ||
          _response_message.invalid("response from service provider"),
        errors: error?.response?.data?.error?.metadata?.fields ||
          error?.response?.data || {
            message: "Something went wrong, please try again later",
          },
      })
    );
    // _handleCatchErrors(error, res);
  }
};
