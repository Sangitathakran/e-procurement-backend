const { sendOtp, loginOrRegister, saveAssociateDetails, onboardingStatus, formPreview } = require("./Controller");
const { validateForm } = require("@src/v1/services/associate/auth/Validation")
const express = require("express");
const { verifyAssociate } = require("../utils/verifyAssociate");
const userAuthRoutes = express.Router();



userAuthRoutes.post("/send-otp", sendOtp);
userAuthRoutes.post("/register-login", loginOrRegister);
userAuthRoutes.put("/onboarding", verifyAssociate, validateForm, saveAssociateDetails);
userAuthRoutes.get("/onboarding", verifyAssociate, formPreview);
userAuthRoutes.get("/onboarding-status", verifyAssociate, onboardingStatus);




module.exports = { userAuthRoutes }; 
