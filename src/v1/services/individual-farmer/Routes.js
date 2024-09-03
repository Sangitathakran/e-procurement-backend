const express = require("express");
const individualFarmerRoutes = express.Router();
const {saveFarmerDetails,sendOTP,verifyOTP} =require('./Controller')

individualFarmerRoutes.get('/basic-details',)
individualFarmerRoutes.post("/send-formerOTP",sendOTP)
individualFarmerRoutes.post("/verify-formerOTP",verifyOTP);
individualFarmerRoutes.post('/onboarding-details',saveFarmerDetails)

module.exports={individualFarmerRoutes}
