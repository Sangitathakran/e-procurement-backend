const { getPendingDistillers, getDistillerById, updateApprovalStatus, getPendingMouList, updateMouApprovalStatus } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOnboardingRoutes = express.Router();

nccfOnboardingRoutes.get("/", Auth, getPendingDistillers);
nccfOnboardingRoutes.get("/pending-Mou-list", Auth, getPendingMouList);
nccfOnboardingRoutes.get('/:id', Auth, getDistillerById);
nccfOnboardingRoutes.patch("/distillers-approve", Auth, updateApprovalStatus);
nccfOnboardingRoutes.patch("/mou-approval", Auth, updateMouApprovalStatus);

module.exports = { nccfOnboardingRoutes }; 
