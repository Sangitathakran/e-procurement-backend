const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { userRegister, sendOtp, loginOrRegister, saveAssociateDetails, onboardingStatus, formPreview } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { validateForm } = require("@src/v1/services/auth/Validation")

const { _collectionName, _userType, _trader_type, _user_status } = require('@src/v1/utils/constants');
const express = require("express");
const userAuthRoutes = express.Router();



userAuthRoutes.post("/send-otp", sendOtp);
userAuthRoutes.post("/registelogin", loginOrRegister);
userAuthRoutes.put("/onboarding", verifyJwtToken, validateForm, saveAssociateDetails);
userAuthRoutes.get("/onboarding", verifyJwtToken, formPreview);
userAuthRoutes.get("/onboarding-status", verifyJwtToken, onboardingStatus);




module.exports = { userAuthRoutes }; 
