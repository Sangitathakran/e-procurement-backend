const { sendOtp, loginOrRegister, saveWarehouseDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, associateBulkuplod } = require("./Controller")
// const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
// const { verifyAssociate } = require("../utils/verifyAssociate");
const wareHouseAuthRoutes = express.Router();

wareHouseAuthRoutes.post("/send-otp", sendOtp);
wareHouseAuthRoutes.post("/register-login", loginOrRegister);
wareHouseAuthRoutes.put("/onboarding", saveWarehouseDetails);
wareHouseAuthRoutes.get("/onboarding", formPreview);
wareHouseAuthRoutes.get("/onboarding-status", onboardingStatus);
wareHouseAuthRoutes.get("/find-user-status", findUserStatus);
wareHouseAuthRoutes.patch("/final-submit", finalFormSubmit);

// userAuthRoutes.get("/editOnboarding", verifyAssociate, editOnboarding);
module.exports = { wareHouseAuthRoutes }; 
