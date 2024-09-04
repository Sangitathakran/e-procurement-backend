const express = require("express");
const individualFarmerRoutes = express.Router();

const { saveFarmerDetails, sendOTP, verifyOTP, registerName} = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");


individualFarmerRoutes.post("/send-formerOTP",sendOTP)
individualFarmerRoutes.post("/verify-formerOTP",verifyOTP);
individualFarmerRoutes.post('/register-details',registerName)
individualFarmerRoutes.put('/onboarding-details/:id',verifyJwtToken,saveFarmerDetails);


module.exports={individualFarmerRoutes}
