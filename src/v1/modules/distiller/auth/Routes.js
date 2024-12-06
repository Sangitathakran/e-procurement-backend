const { sendOtp, loginOrRegister, saveAssociateDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, associateBulkuplod } = require("./Controller")
const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
const { verifyAssociate } = require("../utils/verifyAssociate");
const distillerAuthRoutes = express.Router();

distillerAuthRoutes.post("/send-otp", sendOtp);
distillerAuthRoutes.post("/register-login", loginOrRegister);
distillerAuthRoutes.put("/onboarding", verifyAssociate, validateForm, saveAssociateDetails);
distillerAuthRoutes.get("/onboarding", verifyAssociate, formPreview);
distillerAuthRoutes.get("/onboarding-status", verifyAssociate, onboardingStatus);
distillerAuthRoutes.get("/find-user-status", verifyAssociate, findUserStatus);
distillerAuthRoutes.patch("/final-submit", verifyAssociate, finalFormSubmit);

distillerAuthRoutes.get("/editOnboarding", verifyAssociate, editOnboarding);
distillerAuthRoutes.post("/associate-bulkuplod", associateBulkuplod);
module.exports = { distillerAuthRoutes }; 
