
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { nccfOnboardingRoutes } = require("./onboarding-request/Routes");

const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/onboarding-request", nccfOnboardingRoutes);

module.exports = { nccfRoutes }; 