
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const branchOfficeoRoutes = express.Router();



branchOfficeoRoutes.use("/auth", userAuthRoutes);
branchOfficeoRoutes.use("/center", procurementCenterRoutes);

module.exports = { branchOfficeoRoutes };