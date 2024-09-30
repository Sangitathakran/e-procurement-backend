
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const branchOfficeoRoutes = express.Router();



branchOfficeoRoutes.use("/auth", userAuthRoutes);

module.exports = { branchOfficeoRoutes };