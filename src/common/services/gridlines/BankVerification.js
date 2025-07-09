const { AADHAR_SERVICE_PROVIDER_KEY, ON_GRID_BASE_URL } = require("@config/index");
const { callThirdPartyAPI } = require("@src/v1/axios");


const verifyBankAccountService = async ({ account_number, ifsc }) => {
  const headers = {
    "X-API-Key": AADHAR_SERVICE_PROVIDER_KEY,
    "X-Auth-Type": "API-Key",
  };

  const payload = {
    account_number,
    ifsc,
    consent: "Y",
  };

  const path = "/bank-api/verify";
  const fullPath = `${ON_GRID_BASE_URL}${path}`;

  return await callThirdPartyAPI({
    path: fullPath,
    data: payload,
    method: "POST",
    headers,
  });
};

module.exports = {
  verifyBankAccountService,
};
