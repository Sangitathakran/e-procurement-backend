const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats, getProcurementStatusList, getPendingOffersCountByRequestId } = require("./Controller");
const express = require("express");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", verifyJwtToken, getDashboardStats);
dashboardRoutes.get("/precurement-stats", verifyJwtToken, getProcurementsStats);
dashboardRoutes.get("/precurement-list", verifyJwtToken, getProcurementStatusList);
dashboardRoutes.get("/pending-precurement-list", verifyJwtToken, getPendingOffersCountByRequestId);


module.exports = { dashboardRoutes }; 
