const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getOrder, warehouseList, getMonthlyPaidAmount ,getStateWishProjection,getSateStock} = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const dashboardRoutes = express.Router();


dashboardRoutes.get("/", Auth, getDashboardStats);
dashboardRoutes.get("/getCenterProjections", Auth, getStateWishProjection);
dashboardRoutes.get("/purchase-order", Auth, getOrder);
dashboardRoutes.get("/nearest-warehouse-list", Auth, warehouseList);
dashboardRoutes.get("/payment-disteller", getMonthlyPaidAmount);
dashboardRoutes.get("/getStateWieseStock", Auth ,getSateStock);

module.exports = { dashboardRoutes }; 
