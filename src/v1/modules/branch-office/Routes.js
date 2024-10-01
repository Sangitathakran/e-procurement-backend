
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const { requirementRoutes } = require("./requirement/Routes");
const branchOfficeoRoutes = express.Router();



branchOfficeoRoutes.use("/auth", userAuthRoutes);
branchOfficeoRoutes.use("/req", requirementRoutes);


module.exports = { branchOfficeoRoutes };