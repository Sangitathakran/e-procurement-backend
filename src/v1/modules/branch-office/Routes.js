
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const { paymentRoutes } = require("./payment/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const branchOfficeoRoutes = express.Router();



branchOfficeoRoutes.use("/auth", userAuthRoutes);
branchOfficeoRoutes.use("/payment", paymentRoutes);

branchOfficeoRoutes.use("/center", procurementCenterRoutes);

module.exports = { branchOfficeoRoutes };