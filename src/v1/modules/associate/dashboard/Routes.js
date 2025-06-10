const express = require("express");
const dashbaordRoutes = express.Router();
const { verifyAssociate } = require("../utils/verifyAssociate");

const {
  widgetList,
  dashboardWidgetList, mandiWiseProcurement, incidentalExpense, purchaseLifingMandiWise, purchaseLifingMonthWise, getDistrict
} = require("./Controller");


dashbaordRoutes.get("/widget-list", verifyAssociate, dashboardWidgetList);
dashbaordRoutes.get("/mandiWiseProcurement", verifyAssociate, mandiWiseProcurement);
dashbaordRoutes.get("/incidentalExpense", verifyAssociate, incidentalExpense);
dashbaordRoutes.get("/purchaseLifingMandiWise", verifyAssociate, purchaseLifingMandiWise);
dashbaordRoutes.get("/purchaseLifingMonthWise", verifyAssociate, purchaseLifingMonthWise);
dashbaordRoutes.get("/state-wise-district", getDistrict)
module.exports = { dashbaordRoutes };
