const axios = require('axios');
require('dotenv').config();
 
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
    });

    return response.data;
  } catch (error) {
    const errData = error.response?.data || { message: error.message };
    console.error(`Third Party API Error: ${JSON.stringify(errData)}`);
    throw new Error(errData.message || 'Third party API call failed');
  }
};
 
module.exports = { callThirdPartyAPI };