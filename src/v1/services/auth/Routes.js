const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { userRegister, sendOtp, loginOrRegister, saveAssociateDetails } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { validateForm } = require("@src/v1/services/auth/Validation")

const { _collectionName, _userType, _trader_type, _user_status } = require('@src/v1/utils/constants');
const express = require("express");
const userAuthRoutes = express.Router();



userAuthRoutes.post("/send-otp", sendOtp);
userAuthRoutes.post("/registelogin", loginOrRegister);
userAuthRoutes.put("/onboarding", verifyJwtToken, validateForm, saveAssociateDetails);

userAuthRoutes.post("/", validateErrors, userRegister, [
    body("first_name").optional().trim(),
    body("last_name").optional().trim(),
    body("business_name", _middleware.require("business_name")).notEmpty().trim(),
    body("client_id", _middleware.require("client_id")).notEmpty().trim(),
    body("trader_type").isIn(Object.values(_trader_type)).withMessage(_middleware.invalidTraderType || "Invalid trader type"),  
    body("email", _middleware.require("email")).isEmail().trim().toLowerCase(),
    body("phone").optional().trim(),
    body("password", _middleware.require("password")).isLength({ min: 6 }),
    body("user_status").isIn(Object.values(_user_status)).withMessage(_middleware.invalidUserStatus || "Invalid user status"),  
    body("user_type").optional().trim(),
]);



module.exports = { userAuthRoutes }; 
