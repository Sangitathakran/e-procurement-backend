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
  paymentStatusByDate,
  paymentActivity,
  farmerBenifitted,
  optionRequestId,
  procurementStatus,
} = require("./Controller");

hoDashboardRoutes.get("/widget-list", widgetList);
hoDashboardRoutes.get("/farmer-payments", farmerPayments);
hoDashboardRoutes.get("/revenue-expense", revenueExpenseChart);
hoDashboardRoutes.get("/location-warehouse", locationWareHouseChart);
hoDashboardRoutes.get(
  "/payment-quantity-purchase",
  paymentQuantityPurchase
);
hoDashboardRoutes.get('/requestId-option',optionRequestId)
hoDashboardRoutes.get("/branch-officeprocurement", branchOfficeProcurement);
hoDashboardRoutes.get("/benifitted-farmer", farmerBenifitted);
hoDashboardRoutes.get("/procurement-status", procurementStatus);
hoDashboardRoutes.get("/procurement-ontime", procurementOnTime);
hoDashboardRoutes.get("/payment-status-by-date", paymentStatusByDate);
hoDashboardRoutes.get("/payment-activity",paymentActivity)

module.exports = { hoDashboardRoutes };
