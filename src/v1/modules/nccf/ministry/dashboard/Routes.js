const ministrydashboardRoutes = require("express").Router();
const { Auth } = require("@src/v1/middlewares/jwt")
const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, monthlyLiftedTrends, getMonthlyPayments, stateWiseQuantity, warehouseList, poRaised } = require("./Controller");


ministrydashboardRoutes.get("/", Auth, getDashboardStats);
ministrydashboardRoutes.get("/monthlyLiftedTrends", Auth, monthlyLiftedTrends);
ministrydashboardRoutes.get("/monthlyPaymentRecieved", getMonthlyPayments);
ministrydashboardRoutes.get("/stateWiseQuantity", stateWiseQuantity);
ministrydashboardRoutes.get("/warehouseList", warehouseList);
ministrydashboardRoutes.get("/poRaised", poRaised);

module.exports = { ministrydashboardRoutes }; 
