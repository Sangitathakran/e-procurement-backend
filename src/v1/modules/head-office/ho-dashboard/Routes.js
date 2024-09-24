const express = require("express");
const hoDashboardRoutes = express.Router();

const { widgetList ,farmerPayments,revenueExpenseChart,locationWareHouseChart,paymentQuantityPurchase} = require("./Controller");

hoDashboardRoutes.get("/widget-list", widgetList);
hoDashboardRoutes.get("/farmer-payments",farmerPayments);
hoDashboardRoutes.get("/revenue-expense",revenueExpenseChart)
hoDashboardRoutes.get("/location-warehouse-chart",locationWareHouseChart)
hoDashboardRoutes.get("/payment-quantity-purchase-chart",paymentQuantityPurchase)
module.exports = { hoDashboardRoutes };
