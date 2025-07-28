const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats, getProcurementStatusList, getPendingOffersCountByRequestId, getDashboardStatsWOAggregation } = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const dashboardRoutes = express.Router();


//dashboardRoutes.get("/", Auth, getDashboardStats);
dashboardRoutes.get("/precurement-stats", Auth, getProcurementsStats);
dashboardRoutes.get("/precurement-list", Auth, getProcurementStatusList);
dashboardRoutes.get("/pending-precurement-list", Auth, getPendingOffersCountByRequestId);

dashboardRoutes.get('/', Auth, getDashboardStatsWOAggregation);


module.exports = { dashboardRoutes }; 
