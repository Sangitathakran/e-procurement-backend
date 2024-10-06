
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { requirementRoutes } = require("./requirement/Routes");
const branchOfficeoRoutes = express.Router();



branchOfficeoRoutes.use("/auth", userAuthRoutes);
branchOfficeoRoutes.use("/center", procurementCenterRoutes);
branchOfficeoRoutes.use("/req", requirementRoutes);


module.exports = { branchOfficeoRoutes };