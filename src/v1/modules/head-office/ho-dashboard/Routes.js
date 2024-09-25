const express = require("express");
const hoDashboardRoutes = express.Router();

const {
  widgetList,
  farmerPayments,
  revenueExpenseChart,
  locationWareHouseChart,
  paymentQuantityPurchase,
  branchOfficeProcurement,
  procurementOnTime,
  farmerBenifitted,
  procurementStatus,
} = require("./Controller");

hoDashboardRoutes.get("/widget-list", widgetList);
hoDashboardRoutes.get("/farmer-payments", farmerPayments);
hoDashboardRoutes.get("/revenue-expense", revenueExpenseChart);
hoDashboardRoutes.get("/location-warehouse-chart", locationWareHouseChart);
hoDashboardRoutes.get(
  "/payment-quantity-purchase-chart",
  paymentQuantityPurchase
);
hoDashboardRoutes.get("/branch-officeprocurement", branchOfficeProcurement);
hoDashboardRoutes.get("/benifitted-farmer", farmerBenifitted);
hoDashboardRoutes.get("/procurement-status", procurementStatus);
hoDashboardRoutes.get("/procurement-ontime", procurementOnTime);
module.exports = { hoDashboardRoutes };
