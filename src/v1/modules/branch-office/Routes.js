
const express = require("express");
const { paymentRoutes } = require("./payment/Routes");
const { warehouseRoutes } = require("./warehouse/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { requirementRoutes } = require("./requirement/Routes");
const { dashboardRoutes } = require("./dashboard/Routes");
const { assignSchemeRoutes } = require("./assignScheme/Routes");
const { slaRoute } = require("./sla-management/Routes");
const branchOfficeoRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");
const {dropDownRoute} = require("./dropdown/Routes")


branchOfficeoRoutes.use("/payment", paymentRoutes);
branchOfficeoRoutes.use("/warehouse", warehouseRoutes);
branchOfficeoRoutes.use("/center", procurementCenterRoutes);
branchOfficeoRoutes.use("/req", requirementRoutes);
branchOfficeoRoutes.use("/dashboard", dashboardRoutes);
branchOfficeoRoutes.use("/assignScheme", assignSchemeRoutes);
branchOfficeoRoutes.use("/sla", slaRoute);
branchOfficeoRoutes.use("/dropdown", dropDownRoute);

module.exports = { branchOfficeoRoutes };