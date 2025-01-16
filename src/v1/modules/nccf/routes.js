
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { distillerManagementRoute } = require("./distiller-management/Routes");
const { nccfOnboardingRoutes } = require("./onboarding-request/Routes");
const { nccfOrderRoutes } = require("./order-management/Routes");
const { nccfInventoryRoutes } = require("./inventory-management/Routes");
const { nccfPenaltyRoutes } = require("./penalty-tracking/Routes");
const { nccfPaymentRoutes } = require("./payment/Routes");


const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/dist-management", distillerManagementRoute);
nccfRoutes.use("/onboarding-request", nccfOnboardingRoutes);
nccfRoutes.use("/order", nccfOrderRoutes);
nccfRoutes.use("/inventory", nccfInventoryRoutes);
nccfRoutes.use("/penalty", nccfPenaltyRoutes);
nccfRoutes.use("/payment", nccfPaymentRoutes);


module.exports = { nccfRoutes }; 