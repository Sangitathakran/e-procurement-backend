const express = require("express");
const individualFarmerRoutes = express.Router();
const {
  saveFarmerDetails,
  sendOTP,
  verifyOTP,
  registerName,
} = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");


individualFarmerRoutes.put(
  "/onboarding-details/:id",
  verifyJwtToken,
  saveFarmerDetails
);

individualFarmerRoutes.post("/send-formerOTP", sendOTP);
individualFarmerRoutes.post("/verify-formerOTP", verifyOTP);
individualFarmerRoutes.post("/register-details", registerName);

module.exports = { individualFarmerRoutes };
