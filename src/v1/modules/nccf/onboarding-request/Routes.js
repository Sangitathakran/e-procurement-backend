const { getPendingDistillers, updateApprovalStatus, getPendingMouList } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerAuthRoutes = express.Router();

distillerAuthRoutes.get("/pending-distillers", verifyDistiller, getPendingDistillers);

distillerAuthRoutes.patch("/distillers-approve", verifyDistiller, updateApprovalStatus);
distillerAuthRoutes.get("/pending-Mou-list", verifyDistiller, getPendingMouList);

module.exports = { distillerAuthRoutes }; 
