const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { userRegister, sendOtp, loginOrRegister, saveAssociateDetails } = require("./Controller");
const { verifyJwtToken, verifyJwtTokenViaCookie } = require("@src/v1/utils/helpers/jwt");
const { validateForm } = require("@src/v1/services/auth/Validation")

const { _collectionName, _userType, _trader_type, _user_status } = require('@src/v1/utils/constants');
const express = require("express");
const userAuthRoutes = express.Router();



userAuthRoutes.post("/send-otp", sendOtp);
userAuthRoutes.post("/registelogin", loginOrRegister);
userAuthRoutes.put("/onboarding", verifyJwtToken, validateForm, saveAssociateDetails);



module.exports = { userAuthRoutes }; 
