const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getOrder, warehouseList, getMonthlyPaidAmount ,getStateWishProjection} = require("./Controller");
const { _userType } = require("@src/v1/utils/constants/index")
const express = require("express");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", authenticateUser,authorizeRoles(_userType.distiller) ,Auth, getDashboardStats);
dashboardRoutes.get("/getCenterProjections",authenticateUser,authorizeRoles(_userType.distiller), Auth, getStateWishProjection);
dashboardRoutes.get("/purchase-order",authenticateUser,authorizeRoles(_userType.distiller), Auth, getOrder);
dashboardRoutes.get("/nearest-warehouse-list",authenticateUser,authorizeRoles(_userType.distiller), Auth, warehouseList);
dashboardRoutes.get("/payment-disteller", getMonthlyPaidAmount);

module.exports = { dashboardRoutes }; 
