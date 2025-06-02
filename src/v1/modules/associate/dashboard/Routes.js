const express = require("express");
const dashbaordRoutes = express.Router();
const { verifyAssociate } = require("../utils/verifyAssociate");

const {
  widgetList,
  dashboardWidgetList, mandiWiseProcurement, incidentalExpense, purchaseLifing, purchaseLifingMonthWise
} = require("./Controller");

dashbaordRoutes.get("/widget-list", verifyAssociate, widgetList);
dashbaordRoutes.get("/ho-widget-list", verifyAssociate, dashboardWidgetList);
dashbaordRoutes.get("/mandiWiseProcurement", verifyAssociate, mandiWiseProcurement);
dashbaordRoutes.get("/incidentalExpense", verifyAssociate, incidentalExpense);
dashbaordRoutes.get("/purchaseLifing", verifyAssociate, purchaseLifing);
dashbaordRoutes.get("/purchaseLifingMonthWise", verifyAssociate, purchaseLifingMonthWise);
module.exports = { dashbaordRoutes };
