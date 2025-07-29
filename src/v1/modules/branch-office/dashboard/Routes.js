const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getProcurementsStats, getProcurementStatusList, getPendingOffersCountByRequestId, farmerPayments, agentPayments } = require("./Controller");
const express = require("express");
const dashboardRoutes = express.Router();
const { _userType } = require("@src/v1/utils/constants/index")
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")

dashboardRoutes.get("/",authenticateUser,authorizeRoles(_userType.bo), Auth, getDashboardStats);
dashboardRoutes.get("/precurement-stats",authenticateUser,authorizeRoles(_userType.bo), Auth, getProcurementsStats);
dashboardRoutes.get("/precurement-list",authenticateUser,authorizeRoles(_userType.bo), Auth, getProcurementStatusList);
dashboardRoutes.get("/pending-precurement-list",authenticateUser,authorizeRoles(_userType.bo), Auth, getPendingOffersCountByRequestId);

dashboardRoutes.get("/farmer-payment",authenticateUser,authorizeRoles(_userType.bo), Auth, farmerPayments);
dashboardRoutes.get("/agent-req",authenticateUser,authorizeRoles(_userType.bo), agentPayments);

module.exports = { dashboardRoutes }; 
