const { sendOtp, loginOrRegister, saveAssociateDetails, onboardingStatus, formPreview, useStatusUpdate} = require("./Controller")
const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { verifyAssociate } = require("../utils/verifyAssociate");
const userAuthRoutes = express.Router();




userAuthRoutes.post("/send-otp", sendOtp);
userAuthRoutes.post("/register-login", loginOrRegister);
userAuthRoutes.put("/onboarding", verifyAssociate, validateForm, saveAssociateDetails);
userAuthRoutes.get("/onboarding", verifyAssociate, formPreview);
userAuthRoutes.get("/onboarding-status", verifyAssociate, onboardingStatus);
userAuthRoutes.patch("/update-approval", verifyJwtToken, useStatusUpdate);




module.exports = { userAuthRoutes }; 
