const { sendOtp, loginOrRegister, saveDistillerDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, distillerBulkuplod, deleteManufacturingUnit, getManufacturingUnit, getStorageFacility, deleteStorageFacility, updateStorageFacility, updateManufacturingUnit } = require("./Controller")
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

// distillerAuthRoutes.get("/editOnboarding", verifyDistiller, editOnboarding);
// distillerAuthRoutes.post("/distiller-bulkuplod", distillerBulkuplod);
distillerAuthRoutes.put("/manfacturing-unit", verifyDistiller, updateManufacturingUnit);
distillerAuthRoutes.get("/manfacturing-unit", verifyDistiller, getManufacturingUnit);
distillerAuthRoutes.delete("/manfacturing-unit/:id", deleteManufacturingUnit);
distillerAuthRoutes.put("/storage-facility", verifyDistiller, updateStorageFacility);
distillerAuthRoutes.get("/storage-facility", verifyDistiller, getStorageFacility);
distillerAuthRoutes.delete("/storage-facility/:id", deleteStorageFacility);
module.exports = { distillerAuthRoutes } ; 
