const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats } = require("./Controller");
const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", verifyAgent, getDashboardStats);
dashboardRoutes.get("/precurement-stats", verifyAgent, getProcurementsStats);


module.exports = { dashboardRoutes }; 
