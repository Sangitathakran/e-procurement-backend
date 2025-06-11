const {
  _auth_module,
  _response_message,
  _middleware,
  _query,
} = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { default: axios } = require("axios");
const {
  AADHAR_SERVICE_PROVIDER_KEY,
  AADHAR_SERVICE_PROVIDER,
} = require("@config/index");
const { adharLogger } = require("@config/logger");

module.exports.sendAadharOTP = async (req, res) => {
  try {
    const { uidai_aadharNo } = req.body;

    if (!uidai_aadharNo) {
      adharLogger.warn('Missing Aadhaar number in request');
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require('Aadhar Number') }],
        })
      );
    }

    // Log masked Aadhaar number
    adharLogger.info(
      `Incoming Aadhaar OTP request for: XXXXXX${uidai_aadharNo.slice(-4)}`
    );

    const apiUrl = `${AADHAR_SERVICE_PROVIDER}/generate-otp`;
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
      'Content-Type': 'application/json',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'X-API-Key': AADHAR_SERVICE_PROVIDER_KEY,
      'X-Auth-Type': 'API-Key',
    };

    const payload = {
      aadhaar_number: uidai_aadharNo,
      consent: 'Y',
    };

    adharLogger.info('Sending request to Aadhar OTP API', {
      url: apiUrl,
      headers: {
        'X-API-Key': headers['X-API-Key'],
        'X-Auth-Type': headers['X-Auth-Type'],
      },
      payload,
    });

    const response = await axios.post(apiUrl, payload, { headers });
    const { status, data: responseData } = response || {};

    if (status !== 200 || !responseData?.transaction_id) {
      adharLogger.warn('Failed Aadhar OTP response', {
        status,
        error: response?.data?.error,
      });

      return res.status(200).send(
        new serviceResponse({
          status,
          errors: [{ message: { ...response?.data?.error } }],
        })
      );
    } else if (responseData?.transaction_id) {
      const { transaction_id, code, message: ResponseMsg } = responseData || {};
      const requiredData = {
        transaction_id,
        status,
        code,
      };

      adharLogger.info('Aadhar OTP sent successfully', {
        transaction_id,
        status,
        code,
      });

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: ResponseMsg,
          data: requiredData,
        })
      );
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 500,
          message: 'Unexpected response from Aadhar service provider',
          errors: {
            message:
              'Unable to generate OTP at this moment. Please try again later.',
          },
        })
      );
    }
  } catch (error) {
    const status = error?.response?.status || 500; // Default to 500 if undefined

    adharLogger.error(
      `❌ Error while sending Aadhar OTP: ${
        error?.message || 'Unknown error'
      } | Status: ${status}`
    );
    //log

    return res.status(200).send(
      new serviceResponse({
        status,
        message: _query.invalid('response from service provider'),
        errors: error?.response?.data?.error?.metadata?.fields ||
          error?.response?.data || {
            message: 'Something went wrong, please try again later',
          },
      })
    );
  }
};


module.exports.verifyAadharOTP = async (req, res) => {
  try {
    const { otp, code, transaction_id } = req.body;

    if (!otp) {
      adharLogger.warn("❌ OTP not provided in request");
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require("OTP") }],
        })
      );
    }

    // Log incoming request (masked)
    adharLogger.info(
      `🔐 Verifying OTP for transaction ID : ${transaction_id}`
    );

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

    const payload = { otp, share_code: code };

    const response = await axios.post(apiUrl, payload, { headers });
    const { status, data: fetchedData } = response.data || {};

    adharLogger.info(
      ` OTP verification status: ${status}, Transaction ID: ${transaction_id}`
    );

    if (status != 200) {
      adharLogger.warn(
        ` Failed OTP verification: ${fetchedData?.message || "No message"}`
      );
      return res.status(200).send(
        new serviceResponse({
          status,
          message:
            fetchedData.message ||
            _query.invalid("response from service provider"),
          data: fetchedData,
        })
      );
    } else if (fetchedData?.aadhaar_data) {
      adharLogger.info(
        `📄 Aadhaar data received for Transaction ID: ${transaction_id?.slice(
          -4
        )}`
      );
      const { aadhaar_data = null } = fetchedData;
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: _query.get("Aadhar Details"),
          data: aadhaar_data,
        })
      );
    } else {
      adharLogger.warn(
        `⚠️ No aadhaar_data returned for Transaction ID: ${transaction_id}`
      );
      return res.json(
        new serviceResponse({
          status: 400,
          message: "Something went wrong",
          data: {},
        })
      );
    }
  } catch (error) {
  let responseMessage = "Something went wrong";
  let serviceStatus = 500;
  let fields = null;

  try {
    // Safely extract message and status if present
    const errorData = error?.response?.data?.error;
    responseMessage = errorData?.message || responseMessage;
    serviceStatus = errorData?.status || error?.response?.status || serviceStatus;
    fields = errorData?.metadata?.fields || fields;
  } catch (parseErr) {
    // If error structure is unexpected, log parsing failure
    adharLogger.error(`❌ Failed to parse error response: ${parseErr?.message}`);
  }

  // Log the actual error
  adharLogger.error(
    `❌ Error during OTP verification: ${responseMessage} | Status: ${serviceStatus}`
  );

  return res.status(404).send(
    new serviceResponse({
      status: serviceStatus,
      message: responseMessage || _response_message.invalid("response from service provider"),
      errors: fields || {
        message: "Something went wrong, please try again later",
      },
    })
  );
}

};
