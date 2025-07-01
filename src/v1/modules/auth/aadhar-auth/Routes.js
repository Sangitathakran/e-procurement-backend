const express = require("express");
const { sendAadharOTP, verifyAadharOTP } = require("./Controller");
const aadharAuthRoutes = express.Router();

aadharAuthRoutes.post("/send-otp", sendAadharOTP);
aadharAuthRoutes.post("/verify-otp", verifyAadharOTP);


module.exports = { aadharAuthRoutes };
