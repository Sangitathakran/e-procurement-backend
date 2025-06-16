const {
  _auth_module,
  _response_message,
  _middleware,
  _query,
} = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");

const { sendOtpToAadhar, verifyOtpWithAadhar } = require("@src/v1/common/services/gridlines/AadharVerification");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");

// module.exports.sendAadharOTP = async (req, res) => {
//   try {
//     const { uidai_aadharNo } = req.body;

//     if (!uidai_aadharNo) {
//       return res.status(400).send(
//         new serviceResponse({
//           status: 400,
//           errors: [{ message: _middleware.require('Aadhar Number') }],
//         })
//       );
//     }

//     const apiUrl = `${AADHAR_SERVICE_PROVIDER}/generate-otp`;
//     const headers = {
//       Accept: 'application/json, text/plain, */*',
//       'Accept-Language': 'en-US,en;q=0.9',
//       Connection: 'keep-alive',
//       'Content-Type': 'application/json',
//       'Sec-Fetch-Dest': 'empty',
//       'Sec-Fetch-Mode': 'cors',
//       'Sec-Fetch-Site': 'same-site',
//       'X-API-Key': AADHAR_SERVICE_PROVIDER_KEY,
//       'X-Auth-Type': 'API-Key',
//     };

//     const payload = {
//       aadhaar_number: uidai_aadharNo,
//       consent: 'Y',
//     };

//     const response = await axios.post(apiUrl, payload, { headers });
//     const { status, data: responseData } = response || {};

//     if (status !== 200 || !responseData?.transaction_id) {
//       adharLogger.warn('Failed Aadhar OTP response', {
//         status,
//         error: response?.data?.error,
//       });

//       return res.status(200).send(
//         new serviceResponse({
//           status,
//           errors: [{ message: { ...response?.data?.error } }],
//         })
//       );
//     } else if (responseData?.transaction_id) {
//       const { transaction_id, code, message: ResponseMsg } = responseData || {};
//       const requiredData = {
//         transaction_id,
//         status,
//         code,
//       };

//       return res.status(200).send(
//         new serviceResponse({
//           status: 200,
//           message: ResponseMsg,
//           data: requiredData,
//         })
//       );
//     } else {
//       return res.status(200).send(
//         new serviceResponse({
//           status: 500,
//           message: 'Unexpected response from Aadhar service provider',
//           errors: {
//             message:
//               'Unable to generate OTP at this moment. Please try again later.',
//           },
//         })
//       );
//     }
//   } catch (error) {
//     const status = error?.response?.status || 500; // Default to 500 if undefined
//     return res.status(status).send(
//       new serviceResponse({
//         status,
//         message: error.meesage,
//         errors: error?.response?.data?.error?.metadata?.fields ||
//           error?.response?.data || {
//             message: error.message,
//           },
//       })
//     );
//   }
// };


// module.exports.verifyAadharOTP = async (req, res) => {
//   try {
//     const { otp, code, transaction_id } = req.body;

//     if (!otp) {
//       return res.status(400).send(
//         new serviceResponse({
//           status: 400,
//           errors: [{ message: _middleware.require("OTP") }],
//         })
//       );
//     }

//     const apiUrl = `${AADHAR_SERVICE_PROVIDER}/submit-otp`;
//     const headers = {
//       Accept: "application/json, text/plain, */*",
//       "Accept-Language": "en-US,en;q=0.9",
//       Connection: "keep-alive",
//       "Content-Type": "application/json",
//       "Sec-Fetch-Dest": "empty",
//       "Sec-Fetch-Mode": "cors",
//       "Sec-Fetch-Site": "same-site",
//       "X-API-Key": AADHAR_SERVICE_PROVIDER_KEY,
//       "X-Auth-Type": "API-Key",
//       "X-Transaction-ID": transaction_id,
//     };

//     const payload = { otp, share_code: code };

//     const response = await axios.post(apiUrl, payload, { headers });
//     const { status, data: fetchedData } = response.data || {};

//     if (status != 200) {
//       return res.status(200).send(
//         new serviceResponse({
//           status,
//           message:
//             fetchedData.message ||
//             _query.invalid("response from service provider"),
//           data: fetchedData,
//         })
//       );
//     } else if (fetchedData?.aadhaar_data) {
//       const { aadhaar_data = null } = fetchedData;
//       return res.status(200).send(
//         new serviceResponse({
//           status: 200,
//           message: _query.get("Aadhar Details"),
//           data: aadhaar_data,
//         })
//       );
//     } else {
//       return res.json(
//         new serviceResponse({
//           status: 400,
//           message: "Something went wrong",
//           data: {},
//         })
//       );
//     }
//   } catch (error) {
//   let responseMessage = "Something went wrong";
//   let serviceStatus = 500;
//   let fields = null;

//   try {
//     // Safely extract message and status if present
//     const errorData = error?.response?.data?.error;
//     responseMessage = errorData?.message || responseMessage;
//     serviceStatus = errorData?.status || error?.response?.status || serviceStatus;
//     fields = errorData?.metadata?.fields || fields;
//   } catch (parseErr) {
//     // If error structure is unexpected, log parsing failure
//     console.log(`Failed to parse error response: ${parseErr?.message}`);
//   }

//   return res.status(404).send(
//     new serviceResponse({
//       status: serviceStatus,
//       message: responseMessage || _response_message.invalid("response from service provider"),
//       errors: fields || {
//         message: "Something went wrong, please try again later",
//       },
//     })
//   );
// }

// };


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

    const responseData = await sendOtpToAadhar(uidai_aadharNo);

    if (!responseData?.transaction_id) {
      
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          errors: [{ message: { ...responseData?.error } }],
        })
      );
    }
    //console.log('>>>>>>>>>>>>>>>', responseData);
    const { transaction_id, code, message: ResponseMsg } = responseData;

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: ResponseMsg,
        data: {
          transaction_id,
          code,
          status: 200,
        },
      })
    );
  } catch (error) {
    const status = error?.status || 500;
    const errorData = error?.data || { message: error.message };

    return res.status(status).send(
      new serviceResponse({
        status,
        errors: errorData?.error?.metadata?.fields || errorData,
        message: errorData.message || "Aadhar OTP service failed",
      })
    );
  }
};

module.exports.verifyAadharOTP = async (req, res) => {
  try {
    const { otp, code, transaction_id } = req.body;

    if (!otp || !transaction_id) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _middleware.require("OTP,transaction_id") }],
        })
      );
    }

    const responseData = await verifyOtpWithAadhar({
      otp,
      share_code: code,
      transaction_id,
    });
    const { status, data: fetchedData } = responseData || {};

    if (status !== 200) {
      return res.status(200).send(
        new serviceResponse({
          status,
          message: fetchedData?.message || _query.invalid("response from service provider"),
          data: responseData,
        })
      );
    }

    if (fetchedData?.aadhaar_data) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: _query.get("Aadhar Details"),
          data: fetchedData?.aadhaar_data,
        })
      );
    }

    return res.status(400).send(
      new serviceResponse({
        status: 400,
        message: "Something went wrong",
        data: {},
      })
    );
  } catch (error) {
    let responseMessage = "Something went wrong";
    let serviceStatus = 500;
    let fields = null;

    try {
      const errorData = error?.data?.error;
      responseMessage = errorData?.message || responseMessage;
      serviceStatus = errorData?.status || error?.status || serviceStatus;
      fields = errorData?.metadata?.fields || fields;
    } catch (parseErr) {
      console.log(`Failed to parse error response: ${parseErr?.message}`);
    }

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

