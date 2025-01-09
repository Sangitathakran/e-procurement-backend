
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { distillerManagementRoute } = require("./distiller-management/Routes");
const { nccfOnboardingRoutes } = require("./onboarding-request/Routes");

const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/dist-management", distillerManagementRoute);
nccfRoutes.use("/onboarding-request", nccfOnboardingRoutes);

module.exports = { nccfRoutes }; 