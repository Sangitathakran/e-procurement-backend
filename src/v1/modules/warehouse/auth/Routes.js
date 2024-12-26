const { sendOtp, loginOrRegister, saveWarehouseDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, associateBulkuplod } = require("./Controller")
// const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const wareHouseAuthRoutes = express.Router();

wareHouseAuthRoutes.post("/send-otp", sendOtp);
wareHouseAuthRoutes.post("/register-login", loginOrRegister);
wareHouseAuthRoutes.put("/onboarding", verifyWarehouseOwner, saveWarehouseDetails);
wareHouseAuthRoutes.get("/onboarding", verifyWarehouseOwner, formPreview);
wareHouseAuthRoutes.get("/onboarding-status", verifyWarehouseOwner, onboardingStatus);
wareHouseAuthRoutes.get("/find-user-status", verifyWarehouseOwner, findUserStatus);
wareHouseAuthRoutes.patch("/final-submit", verifyWarehouseOwner, finalFormSubmit);

// userAuthRoutes.get("/editOnboarding", verifyAssociate, editOnboarding);
module.exports = { wareHouseAuthRoutes }; 
