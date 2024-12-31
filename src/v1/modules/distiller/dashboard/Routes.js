const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getDistillerStats, getDistillertatusList, getPendingOffersCountByRequestId } = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", Auth, getDashboardStats);
dashboardRoutes.get("/distiller-stats", Auth, getDistillerStats);
dashboardRoutes.get("/nearest-warehouse-list", Auth, getDistillertatusList);
// dashboardRoutes.get("/pending-precurement-list", Auth, getPendingOffersCountByRequestId);


module.exports = { dashboardRoutes }; 
