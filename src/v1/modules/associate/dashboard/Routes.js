const express = require("express");
const dashbaordRoutes = express.Router();
const { verifyAssociate } = require("../utils/verifyAssociate");

const {
  widgetList,
  dashboardWidgetList, mandiWiseProcurement, incidentalExpense, purchaseLifingMandiWise, purchaseLifingMonthWise, getDistrict
} = require("./Controller");


dashbaordRoutes.post("/widget-list", verifyAssociate, dashboardWidgetList);
dashbaordRoutes.post("/mandiWiseProcurement", verifyAssociate, mandiWiseProcurement);
dashbaordRoutes.post("/incidentalExpense", verifyAssociate, incidentalExpense);
dashbaordRoutes.post("/purchaseLifingMandiWise", verifyAssociate, purchaseLifingMandiWise);
dashbaordRoutes.get("/state-wise-district", getDistrict)
module.exports = { dashbaordRoutes };
