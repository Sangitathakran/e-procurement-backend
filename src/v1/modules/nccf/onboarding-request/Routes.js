const { getPendingDistillers, getDistillerById, updateApprovalStatus, getPendingMouList, updateMouApprovalStatus } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
// const { verifyDistiller } = require("../utils/verifyDistiller");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOnboardingRoutes = express.Router();

// nccfOnboardingRoutes.get("/pending-distillers", Auth, getPendingDistillers);
// nccfOnboardingRoutes.get('/:id', Auth, getDistillerById);
// nccfOnboardingRoutes.patch("/distillers-approve", Auth, updateApprovalStatus);
// nccfOnboardingRoutes.get("/pending-Mou-list", Auth, getPendingMouList);
// nccfOnboardingRoutes.patch("/mou-approval", Auth, updateMouApprovalStatus);

nccfOnboardingRoutes.get("/", getPendingDistillers);
nccfOnboardingRoutes.get("/pending-Mou-list", getPendingMouList);
nccfOnboardingRoutes.get('/:id', getDistillerById);
nccfOnboardingRoutes.patch("/distillers-approve", updateApprovalStatus);
nccfOnboardingRoutes.patch("/mou-approval", updateMouApprovalStatus);

module.exports = { nccfOnboardingRoutes }; 
