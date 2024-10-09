const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats, getProcurementStatusList, getPendingOffersCountByRequestId } = require("./Controller");
const express = require("express");
const { verifyAgent } = require("../utils/verifyAgent");
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", verifyAgent, getDashboardStats);
dashboardRoutes.get("/precurement-stats", verifyAgent, getProcurementsStats);
dashboardRoutes.get("/precurement-list", verifyAgent, getProcurementStatusList);
dashboardRoutes.get("/pending-precurement-list", verifyAgent, getPendingOffersCountByRequestId);


module.exports = { dashboardRoutes }; 
