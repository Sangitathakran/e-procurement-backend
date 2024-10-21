const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats, getProcurementStatusList, getPendingOffersCountByRequestId } = require("./Controller");
const express = require("express");
const { verifyBO } = require("../utils/verifyBO");
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", verifyBO, getDashboardStats);
dashboardRoutes.get("/precurement-stats", verifyBO, getProcurementsStats);
dashboardRoutes.get("/precurement-list", verifyBO, getProcurementStatusList);
dashboardRoutes.get("/pending-precurement-list", verifyBO, getPendingOffersCountByRequestId);

module.exports = { dashboardRoutes }; 
