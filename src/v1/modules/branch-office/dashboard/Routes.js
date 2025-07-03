const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats, getProcurementStatusList, getPendingOffersCountByRequestId, farmerPayments, agentPayments, getStateWiseCommodityStatus, getDistrict } = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", Auth, getDashboardStats);
dashboardRoutes.get("/precurement-stats", Auth, getProcurementsStats);
dashboardRoutes.get("/precurement-list", Auth, getProcurementStatusList);
dashboardRoutes.get("/pending-precurement-list", Auth, getPendingOffersCountByRequestId);

dashboardRoutes.get("/farmer-payment", Auth, farmerPayments);
dashboardRoutes.get("/agent-req", agentPayments);
dashboardRoutes.get("/state-wise-commodity", Auth, getStateWiseCommodityStatus);
dashboardRoutes.get("/state-wise-district",Auth, getDistrict) //**statewise district */

module.exports = { dashboardRoutes }; 
