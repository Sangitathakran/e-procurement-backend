const express = require("express");
const { sendAadharOTP, verifyAadharOTP, verifyBankAccount } = require("./Controller");
const aadharAuthRoutes = express.Router();

aadharAuthRoutes.post("/send-otp", sendAadharOTP);
aadharAuthRoutes.post("/verify-otp", verifyAadharOTP);
aadharAuthRoutes.post('/bank_verify', verifyBankAccount);


module.exports = { aadharAuthRoutes };
