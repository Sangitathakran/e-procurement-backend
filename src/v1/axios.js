const axios = require('axios');
require('dotenv').config();
const https = require("https");


/**
 * Generic request handler for third-party APIs with dynamic headers
 * @param {Object} config
 * @param {String} config.path - endpoint path (e.g., /aadhaar-api/boson)
 * @param {String} config.baseURL - base url ( e.g., https://domain.com)
 * @param {Object} [config.data={}] - request payload (for POST/PUT)
 * @param {String} [config.method='POST'] - HTTP method
 * @param {Object} [config.headers={}] - additional headers (will merge with defaults)
 * @returns {Promise<Object>} - API response
 */
const callThirdPartyAPI = async ({ baseURL, path, data = {}, method = 'POST', headers = {} }) => {
  try {
    const response = await axios.request({
      baseURL,
      url: path,
      method,
      data,
      headers,
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    return response.data;
  } catch (error) {
    const errData = error.response?.data || { message: error.message };
       // console.log(errData)

    console.error(`Third Party API Error: `, errData);
    throw new Error(errData?.error?.message || 'Third party API call failed');
  }
};

module.exports = { callThirdPartyAPI };
