const ministrydashboardRoutes = require("express").Router();
const { Auth } = require("@src/v1/middlewares/jwt")
const { _middleware } = require("@src/v1/utils/constants/messages");
const { getDashboardStats, filterWiseDashboardStats, monthlyLiftedTrends, getMonthlyPayments, stateWiseQuantity, stateWiseProcurementQuantity,
     stateWiseLiftingQuantity, warehouseList, poRaised, ongoingOrders, stateWiseAnalysis, getStateWishProjection, 
     paymentWithTenPercant, paymentWithHundredPercant
} = require("./Controller");


ministrydashboardRoutes.get("/", Auth, getDashboardStats);
ministrydashboardRoutes.get("/filterWiseDashboardStats", Auth, filterWiseDashboardStats);
ministrydashboardRoutes.get("/monthlyLiftedTrends", Auth, monthlyLiftedTrends);
ministrydashboardRoutes.get("/monthlyPaymentRecieved", Auth, getMonthlyPayments);
ministrydashboardRoutes.get("/stateWiseQuantity", Auth, stateWiseQuantity);
ministrydashboardRoutes.get("/stateWiseProcurementQuantity", Auth, stateWiseProcurementQuantity);
ministrydashboardRoutes.get("/stateWiseLiftingQuantity", Auth, stateWiseLiftingQuantity);
ministrydashboardRoutes.get("/warehouseList", Auth, warehouseList);
ministrydashboardRoutes.get("/poRaised", Auth, poRaised);
ministrydashboardRoutes.get("/ongoingOrders", Auth, ongoingOrders);
ministrydashboardRoutes.get("/stateWiseAnalysis", Auth, stateWiseAnalysis);
ministrydashboardRoutes.get("/getCenterProjections", Auth, getStateWishProjection);
ministrydashboardRoutes.get("/paymentWithTenPercant", Auth, paymentWithTenPercant);
ministrydashboardRoutes.get("/paymentWithHundredPercant", Auth, paymentWithHundredPercant);

module.exports = { ministrydashboardRoutes }; 
