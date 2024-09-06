const express = require("express");
const individualFarmerRoutes = express.Router();

const { saveFarmerDetails, sendOTP, verifyOTP, registerName, getFarmerDetails} = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");


const {validateFarmer,validateRegisterDetail} =require("../individual-farmer/Validation");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");


individualFarmerRoutes.post("/send-formerOTP",sendOTP)
individualFarmerRoutes.post("/verify-formerOTP",verifyOTP);
individualFarmerRoutes.post('/register-details',[validateRegisterDetail,validateErrors],registerName)
individualFarmerRoutes.post("/send-farmerOTP",sendOTP)
individualFarmerRoutes.post("/verify-farmerOTP",verifyOTP);
individualFarmerRoutes.post('/register-details',registerName)

individualFarmerRoutes.put('/onboarding-details/:id',
    verifyJwtToken, 
    [validateFarmer,validateErrors],
    saveFarmerDetails);

individualFarmerRoutes.get('/getFarmerDetails/:id',verifyJwtToken, getFarmerDetails);


module.exports = { individualFarmerRoutes };
