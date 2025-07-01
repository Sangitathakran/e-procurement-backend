
const express = require("express");
const { nccfAuthRoutes } = require("./auth/Routes");
const { distillerManagementRoute } = require("./distiller-management/Routes");
const { nccfOnboardingRoutes } = require("./onboarding-request/Routes");
const { nccfOrderRoutes } = require("./order-management/Routes");
const { nccfInventoryRoutes } = require("./inventory-management/Routes");
const { nccfPenaltyRoutes } = require("./penalty-tracking/Routes");
const { nccfPaymentRoutes } = require("./payment/Routes");
const { nccfDashboardRoutes } = require("./dashboard/Router");
const { nccfCenterProjectionRoutes } = require("./projection/Router");
const { dropDownRoutes } = require("./dropDown/Routes");
const { ministryRoutes } = require("./ministry/Routes");
const nccfRoutes = express.Router();

nccfRoutes.use("/auth", nccfAuthRoutes);
nccfRoutes.use("/dist-management", distillerManagementRoute);
nccfRoutes.use("/onboarding-request", nccfOnboardingRoutes);
nccfRoutes.use("/order", nccfOrderRoutes);
nccfRoutes.use("/inventory", nccfInventoryRoutes);
nccfRoutes.use("/penalty", nccfPenaltyRoutes);
nccfRoutes.use("/payment", nccfPaymentRoutes);
nccfRoutes.use("/dashboard", nccfDashboardRoutes);
nccfRoutes.use("/center-projection", nccfCenterProjectionRoutes);
nccfRoutes.use("/dropDown", dropDownRoutes);
nccfRoutes.use("/ministry", ministryRoutes);

module.exports = { nccfRoutes }; 