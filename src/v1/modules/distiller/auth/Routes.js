const { sendOtp, loginOrRegister, saveDistillerDetails, onboardingStatus, formPreview, findUserStatus, finalFormSubmit, editOnboarding, distillerBulkuplod, deleteManufacturingUnit, getManufacturingUnit, getStorageFacility, deleteStorageFacility, updateStorageFacility, updateManufacturingUnit } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerAuthRoutes = express.Router();

distillerAuthRoutes.post("/send-otp", sendOtp);
distillerAuthRoutes.post("/register-login", loginOrRegister);
distillerAuthRoutes.put("/onboarding", validateForm, saveDistillerDetails);
distillerAuthRoutes.get("/onboarding", formPreview);
distillerAuthRoutes.get("/onboarding-status", onboardingStatus);
distillerAuthRoutes.get("/find-user-status", findUserStatus);
distillerAuthRoutes.patch("/final-submit", finalFormSubmit);

distillerAuthRoutes.get("/editOnboarding", verifyDistiller, editOnboarding);
distillerAuthRoutes.post("/distiller-bulkuplod", distillerBulkuplod);
distillerAuthRoutes.put("/manfacturing-unit", verifyDistiller, updateManufacturingUnit);
distillerAuthRoutes.get("/manfacturing-unit", verifyDistiller, getManufacturingUnit);
distillerAuthRoutes.delete("/manfacturing-unit/:id", verifyDistiller, deleteManufacturingUnit);
distillerAuthRoutes.put("/storage-facility", verifyDistiller, updateStorageFacility);
distillerAuthRoutes.get("/storage-facility", verifyDistiller, getStorageFacility);
distillerAuthRoutes.delete("/storage-facility/:id", verifyDistiller, deleteStorageFacility);
module.exports = { distillerAuthRoutes } ; 
