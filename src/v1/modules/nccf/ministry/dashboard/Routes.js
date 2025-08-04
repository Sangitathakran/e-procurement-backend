const ministrydashboardRoutes = require("express").Router();
const { Auth } = require("@src/v1/middlewares/jwt")
const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, monthlyLiftedTrends, getMonthlyPayments, stateWiseQuantity, stateWiseProcurementQuantity,
     stateWiseLiftingQuantity, warehouseList, poRaised, ongoingOrders, stateWiseAnalysis, getStateWiseProjection,
     paymentWithTenPercant, paymentWithHundredPercant, performanceByDistiller
} = require("./Controller");


ministrydashboardRoutes.get("/",  getDashboardStats);
ministrydashboardRoutes.get("/monthlyLiftedTrends", Auth, monthlyLiftedTrends);
ministrydashboardRoutes.get("/stateWiseAnalysis", Auth, stateWiseAnalysis);
ministrydashboardRoutes.get("/monthlyPaymentRecieved", Auth, getMonthlyPayments);
ministrydashboardRoutes.get("/stateWiseQuantity", Auth, stateWiseQuantity);
ministrydashboardRoutes.get("/stateWiseProcurementQuantity", Auth, stateWiseProcurementQuantity);
ministrydashboardRoutes.get("/stateWiseLiftingQuantity", Auth, stateWiseLiftingQuantity);
ministrydashboardRoutes.get("/paymentWithTenPercant", Auth, paymentWithTenPercant);
ministrydashboardRoutes.get("/paymentWithHundredPercant", Auth, paymentWithHundredPercant);
ministrydashboardRoutes.get("/warehouseList", Auth, warehouseList);
ministrydashboardRoutes.get("/poRaised", Auth, poRaised);
ministrydashboardRoutes.get("/ongoingOrders", Auth, ongoingOrders);
ministrydashboardRoutes.get("/performanceByDistiller", Auth, performanceByDistiller);
ministrydashboardRoutes.get("/getCenterProjections", Auth, getStateWiseProjection);

module.exports = { ministrydashboardRoutes }; 
