const { callAPI } = require('./apiContainer');

async function verifyAadhaar(aadhaarNumber) {
  return await callAPI('/verify-aadhaar', { aadhaarNumber });
}

async function verifyBank(accountNumber, ifsc) {
  return await callAPI('/verify-bank', { accountNumber, ifsc });
}

module.exports = {
  verifyAadhaar,
  verifyBank,
};
