
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { nccfOnboardingRoutes } = require("./onboarding-request/Routes");
const { nccfOrderRoutes } = require("./order-management/Routes");
const { nccfInventoryRoutes } = require("./inventory-management/Routes");

const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/onboarding-request", nccfOnboardingRoutes);
nccfRoutes.use("/order", nccfOrderRoutes);
nccfRoutes.use("/inventory", nccfInventoryRoutes);

module.exports = { nccfRoutes }; 