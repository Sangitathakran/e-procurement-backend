const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, getonBoardingRequests, getpenaltyStatus, getWarehouseList, getMonthlyPaidAmount } = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const nccfDashboardRoutes = express.Router();


nccfDashboardRoutes.get("/", Auth, getDashboardStats);
nccfDashboardRoutes.get("/onboarding-requests", Auth, getonBoardingRequests);
nccfDashboardRoutes.get("/penalty-status", Auth, getpenaltyStatus);
nccfDashboardRoutes.get("/warehouses", Auth, getWarehouseList);
nccfDashboardRoutes.get("/payment-disteller", Auth, getMonthlyPaidAmount);


module.exports = { nccfDashboardRoutes }; 
