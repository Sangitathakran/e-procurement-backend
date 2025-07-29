const { sendOtp, loginOrRegister, saveAssociateDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, associateBulkuplod, associateNorthEastBulkuplod } = require("./Controller")
const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
const { verifyAssociate } = require("../utils/verifyAssociate");
const userAuthRoutes = express.Router();
const {loginRequestPerMinute } = require("@src/v1/middlewares/express_app");

userAuthRoutes.post("/send-otp",loginRequestPerMinute, sendOtp);
userAuthRoutes.post("/register-login",loginRequestPerMinute, loginOrRegister);
userAuthRoutes.put("/onboarding", verifyAssociate, validateForm, saveAssociateDetails);
userAuthRoutes.get("/onboarding", verifyAssociate, formPreview);
userAuthRoutes.get("/onboarding-status", verifyAssociate, onboardingStatus);
userAuthRoutes.get("/find-user-status", verifyAssociate, findUserStatus);
userAuthRoutes.patch("/final-submit", verifyAssociate, finalFormSubmit);

userAuthRoutes.get("/editOnboarding", verifyAssociate, editOnboarding);
userAuthRoutes.post("/associate-bulkuplod", associateBulkuplod);
userAuthRoutes.post("/associateNorthEastFarmer-bulkuplod", associateNorthEastBulkuplod);
module.exports = { userAuthRoutes }; 
