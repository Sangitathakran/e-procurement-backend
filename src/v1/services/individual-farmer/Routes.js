const express = require("express");
const individualFarmerRoutes = express.Router();
const {saveFarmerDetails} =require('./Controller')
const { verifyJwtToken,generateJwtToken } = require("@src/v1/utils/helpers/jwt");
//console.log(generateJwtToken({mobile_no:"8864995639"}))
individualFarmerRoutes.put('/onboarding-details/:id',verifyJwtToken,saveFarmerDetails);

module.exports={individualFarmerRoutes}