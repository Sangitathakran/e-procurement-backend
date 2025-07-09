const { AADHAR_SERVICE_PROVIDER_KEY, AADHAR_SERVICE_PROVIDER, ON_GRID_BASE_URL } = require("@config/index");
const { callThirdPartyAPI } = require("@src/v1/axios");

const sendOtpToAadhar = async (aadhaar_number) => {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": AADHAR_SERVICE_PROVIDER_KEY,
    "X-Auth-Type": "API-Key",
  };

  const payload = {
    aadhaar_number,
    consent: "Y",
  };

  const path = "/aadhaar-api/boson/generate-otp"; 
  const fullUrlPath = `${ON_GRID_BASE_URL}${path}`; 

  return await callThirdPartyAPI({
    path: fullUrlPath,
    data: payload,
    method: "POST",
    headers,
  });
};

const verifyOtpWithAadhar = async ({ otp, share_code, transaction_id }) => {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": AADHAR_SERVICE_PROVIDER_KEY,
    "X-Auth-Type": "API-Key",
    "X-Transaction-ID": transaction_id,
  };

  const payload = {
    otp,
    share_code
  };

  const path = "/aadhaar-api/boson/submit-otp";
  const fullUrlPath = `${ON_GRID_BASE_URL}${path}`;

  return await callThirdPartyAPI({
    path: fullUrlPath,
    data: payload,
    method: "POST",
    headers,
  });
};

module.exports = { sendOtpToAadhar, verifyOtpWithAadhar };
