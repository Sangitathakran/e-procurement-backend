
const express = require("express");
const { paymentRoutes } = require("./payment/Routes");
const { warehouseRoutes } = require("./warehouse/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { requirementRoutes } = require("./requirement/Routes");
const { dashboardRoutes } = require("./dashboard/Routes");
const branchOfficeoRoutes = express.Router();


branchOfficeoRoutes.use("/payment", paymentRoutes);
branchOfficeoRoutes.use("/warehouse", warehouseRoutes);
branchOfficeoRoutes.use("/center", procurementCenterRoutes);
branchOfficeoRoutes.use("/req", requirementRoutes);
branchOfficeoRoutes.use("/dashboard", dashboardRoutes);


module.exports = { branchOfficeoRoutes };