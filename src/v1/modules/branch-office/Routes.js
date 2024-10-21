
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const { paymentRoutes } = require("./payment/Routes");
const { warehouseRoutes } = require("./warehouse/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { requirementRoutes } = require("./requirement/Routes");
const { dashboardRoutes } = require("./dashboard/Routes");
const branchOfficeoRoutes = express.Router();


branchOfficeoRoutes.use("/auth", userAuthRoutes);
branchOfficeoRoutes.use("/payment", paymentRoutes);
branchOfficeoRoutes.use("/warehouse", warehouseRoutes);
branchOfficeoRoutes.use("/center", procurementCenterRoutes);
branchOfficeoRoutes.use("/req", requirementRoutes);
branchOfficeoRoutes.use("/dashboard", dashboardRoutes);


module.exports = { branchOfficeoRoutes };