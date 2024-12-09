const { sendOtp, loginOrRegister, saveDistillerDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, distillerBulkuplod } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerAuthRoutes = express.Router();

distillerAuthRoutes.post("/send-otp", sendOtp);
distillerAuthRoutes.post("/register-login", loginOrRegister);
distillerAuthRoutes.put("/onboarding", verifyDistiller, validateForm, saveDistillerDetails);
distillerAuthRoutes.get("/onboarding", verifyDistiller, formPreview);
distillerAuthRoutes.get("/onboarding-status", verifyDistiller, onboardingStatus);
distillerAuthRoutes.get("/find-user-status", verifyDistiller, findUserStatus);
distillerAuthRoutes.patch("/final-submit", verifyDistiller, finalFormSubmit);

distillerAuthRoutes.get("/editOnboarding", verifyDistiller, editOnboarding);
distillerAuthRoutes.post("/distiller-bulkuplod", distillerBulkuplod);
module.exports = { distillerAuthRoutes } ; 
