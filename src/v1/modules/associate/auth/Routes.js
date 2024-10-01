const { sendOtp, loginOrRegister, saveAssociateDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit } = require("./Controller")
const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
const { verifyAssociate } = require("../utils/verifyAssociate");
const { verifyAgent } = require("../../agent/utils/verifyAgent");
const userAuthRoutes = express.Router();

userAuthRoutes.post("/send-otp", sendOtp);
userAuthRoutes.post("/register-login", loginOrRegister);
userAuthRoutes.put("/onboarding", verifyAssociate, validateForm, saveAssociateDetails);
userAuthRoutes.get("/onboarding", verifyAssociate, formPreview);
userAuthRoutes.get("/onboarding-status", verifyAssociate, onboardingStatus);
userAuthRoutes.get("/find-user-status", verifyAssociate, findUserStatus);
userAuthRoutes.patch("/final-submit", verifyAssociate, finalFormSubmit);


module.exports = { userAuthRoutes }; 
