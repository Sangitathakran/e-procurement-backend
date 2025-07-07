const { BANK_VERIFICATION_API_KEY, AADHAR_VERIFICATION_API_KEY,ON_GRID_BASE_URL } = require("@config/index");
const { callThirdPartyAPI } = require("@src/common/axios/axiosServices");
const logger = require('@src/common/logger/logger'); 

const retryAsync = async (fn, retries = 2, delay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const statusCode = error?.response?.data?.status || error?.response?.status;

      const shouldRetry = statusCode === 500;

      if (!shouldRetry) {
        break; 
      }

      if (attempt < retries) {
        logger.warn(`Retrying (${attempt + 1}/${retries}) due to 500 - Internal Server Error`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  throw lastError;
};

// Aadhaar Verification
const aadherVerfiycation = async (aadhaar_number) => {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": AADHAR_VERIFICATION_API_KEY,
    "X-Auth-Type": "API-Key",
  };

  const payload = {
    aadhaar_number,
    consent: "Y",
  };

  const fullUrlPath = `${ON_GRID_BASE_URL}/aadhaar-api/verify`;

  const requestFn = () => callThirdPartyAPI({
    path: fullUrlPath,
    data: payload,
    method: "POST",
    headers,
  });

  try {
    const response = await retryAsync(requestFn, 2);
    logger.info(` Aadhaar verification successful for: ${aadhaar_number}`);
    return response;
  } catch (error) {
    logger.error(` Aadhaar verification failed for ${aadhaar_number}: ${error?.response?.data?.error?.message || error.message}`);
    console.log(error)
    return error?.response?.data
  }
};

// Bank Verification
const bankVerfiycation = async (account_number, ifsc) => {
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": BANK_VERIFICATION_API_KEY,
    "X-Auth-Type": "API-Key",
  };

  const payload = {
    account_number,
    consent: "Y",
    ifsc,
  };

  const fullUrlPath = `${ON_GRID_BASE_URL}/bank-api/verify/penniless`;

  const requestFn = () => callThirdPartyAPI({
    path: fullUrlPath,
    data: payload,
    method: "POST",
    headers,
  });

  try {
    const response = await retryAsync(requestFn, 2);
    logger.info(` Bank verification successful for: ${account_number}/${ifsc}`);
    return response;
  } catch (error) {
    logger.error(` Bank verification failed for ${account_number}/${ifsc}: ${error?.response?.data?.error?.message || error.message}`);
    return {
      success: false,
      message: "Bank verification failed after retries.",
      error: error?.response?.data || error.message,
    };
  }
};

module.exports = {
  aadherVerfiycation,
  bankVerfiycation,
};
