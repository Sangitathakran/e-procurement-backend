const { sendOtp, loginOrRegister, saveWarehouseDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, associateBulkuplod } = require("./Controller")
// const { validateForm } = require("@src/v1/modules/associate/auth/Validation")
const express = require("express");
const { verifyWarehouse } = require("../utils/verifyWarehouse");
const wareHouseAuthRoutes = express.Router();

wareHouseAuthRoutes.post("/send-otp", sendOtp);
wareHouseAuthRoutes.post("/register-login", loginOrRegister);
wareHouseAuthRoutes.put("/onboarding", verifyWarehouse, saveWarehouseDetails);
wareHouseAuthRoutes.get("/onboarding", verifyWarehouse, formPreview);
wareHouseAuthRoutes.get("/onboarding-status", verifyWarehouse, onboardingStatus);
wareHouseAuthRoutes.get("/find-user-status", verifyWarehouse, findUserStatus);
wareHouseAuthRoutes.patch("/final-submit", verifyWarehouse, finalFormSubmit);

// userAuthRoutes.get("/editOnboarding", verifyAssociate, editOnboarding);
module.exports = { wareHouseAuthRoutes }; 
