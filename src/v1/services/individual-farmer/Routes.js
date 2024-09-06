const express = require("express");
const individualFarmerRoutes = express.Router();

const { saveFarmerDetails, sendOTP, verifyOTP, registerName, getFarmerDetails} = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");


individualFarmerRoutes.post("/send-farmerOTP",sendOTP)
individualFarmerRoutes.post("/verify-farmerOTP",verifyOTP);
individualFarmerRoutes.post('/register-details',registerName)

individualFarmerRoutes.put('/onboarding-details/:id',verifyJwtToken,saveFarmerDetails);

individualFarmerRoutes.get('/getFarmerDetails/:id',verifyJwtToken, getFarmerDetails);


module.exports={individualFarmerRoutes}
