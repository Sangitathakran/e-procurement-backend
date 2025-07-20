const express = require("express");
const hoDashboardRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");
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
  dashboardWidgetList,
  farmerPendingPayments,
  farmerPendingApproval,
  satewiseProcurement,
  getcommodity,
  getAssignedSchemes,
  stateWiseCommodityDetail,
  getStateWiseCommodityStats
} = require("./Controller");


hoDashboardRoutes.get("/widget-list", widgetList);
hoDashboardRoutes.get("/ho-widget-list", dashboardWidgetList); // 
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
hoDashboardRoutes.get("/farmer-pending-payments", farmerPendingPayments); 
hoDashboardRoutes.get("/farmer-pending-approval", farmerPendingApproval); 
hoDashboardRoutes.get("/statewise-procurement", satewiseProcurement); 

hoDashboardRoutes.get("/commodity", Auth, getcommodity);
hoDashboardRoutes.get("/getscheme", Auth, getAssignedSchemes);
hoDashboardRoutes.get("/statewise-commodity", getStateWiseCommodityStats);


module.exports = { hoDashboardRoutes };
