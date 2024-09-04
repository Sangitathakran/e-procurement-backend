const express = require("express");
const individualFarmerRoutes = express.Router();
const { body } = require("express-validator");
const { saveFarmerDetails, sendOTP, verifyOTP, registerName} = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");


individualFarmerRoutes.post("/send-formerOTP",sendOTP)
individualFarmerRoutes.post("/verify-formerOTP",verifyOTP);
individualFarmerRoutes.post('/register-details',registerName)
const {saveFarmerDetails} =require('./Controller')
const { verifyJwtToken,generateJwtToken } = require("@src/v1/utils/helpers/jwt");
//console.log(generateJwtToken({mobile_no:"8864995639"}))
individualFarmerRoutes.put('/onboarding-details/:id',verifyJwtToken,saveFarmerDetails);


module.exports={individualFarmerRoutes}
