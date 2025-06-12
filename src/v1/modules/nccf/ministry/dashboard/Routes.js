const ministrydashboardRoutes = require("express").Router();
const { Auth } = require("@src/v1/middlewares/jwt")
const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, monthlyLiftedTrends, MonthlyPaymentRecieved, getMonthlyPayments } = require("./Controller");


ministrydashboardRoutes.get("/", Auth, getDashboardStats);
ministrydashboardRoutes.get("/monthlyLiftedTrends", Auth, monthlyLiftedTrends);
// ministrydashboardRoutes.get("/MonthlyPaymentRecieved", MonthlyPaymentRecieved);
ministrydashboardRoutes.get("/monthlyPaymentRecieved", getMonthlyPayments);
module.exports = { ministrydashboardRoutes }; 
