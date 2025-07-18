const {
  UPAG_BASE_URL,
  UPAG_CLIENT_ID,
  UPAG_CLIENT_SECRET,
  UPAG_EMAIL,
  UPAG_PASSWORD,
} = require("@config/index");
const { callThirdPartyAPI } = require("@src/v1/axios");
const { getCache, setCache } = require("@src/v1/utils/cache");

const getUpagAccessToken = async () => {
  const cacheKey = "upag_access_token";
  const cachedToken = getCache(cacheKey);

  if (cachedToken) {
    return cachedToken;
  }

  const baseURL = UPAG_BASE_URL;
  const path = "/auth/generate-token";

  const headers = {
    clientId: UPAG_CLIENT_ID,
    clientSecret: UPAG_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  const data = {
    email: UPAG_EMAIL,
    password: UPAG_PASSWORD,
  };

  console.log( baseURL, path, headers, data);

  const response = await callThirdPartyAPI({
    baseURL,
    path,
    method: "POST",
    headers,
    data,
  });
console.log(response);
  // Set cache for 5 min (300 seconds)
  setCache(cacheKey, response.access_token, 300);

  return response.access_token;
};

const submitProcurementData = async (token, payload) => {
  const baseURL = UPAG_BASE_URL;
  const path = "/procurement";

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const response = await callThirdPartyAPI({
    baseURL,
    path,
    method: "POST",
    headers,
    data: payload,
  });

  return response;
};

const submitStockData = async (token, payload) => {
   
  return await callThirdPartyAPI({
    baseURL: UPAG_BASE_URL,
    path: "/stock",
    method: "POST",
    data: payload,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

module.exports = {
  getUpagAccessToken,
  submitProcurementData,
  submitStockData,
};
