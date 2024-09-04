const express = require("express");
const individualFarmerRoutes = express.Router();
const { body } = require("express-validator");
const { saveFarmerDetails, sendOTP, verifyOTP, registerName} = require("./Controller");



individualFarmerRoutes.post("/send-formerOTP",sendOTP)
individualFarmerRoutes.post("/verify-formerOTP",verifyOTP);
individualFarmerRoutes.post('/register-details',registerName)
individualFarmerRoutes.post('/onboarding-details',saveFarmerDetails)


module.exports={individualFarmerRoutes}
