const express = require("express");
const dashbaordRoutes = express.Router();
const { verifyAssociate } = require("../utils/verifyAssociate");

const {
  widgetList,
  dashboardWidgetList, mandiWiseProcurement, incidentalExpense
} = require("./Controller");

dashbaordRoutes.get("/widget-list", verifyAssociate, widgetList);
dashbaordRoutes.get("/ho-widget-list", verifyAssociate, dashboardWidgetList);
dashbaordRoutes.get("/mandiWiseProcurement", verifyAssociate, mandiWiseProcurement);
dashbaordRoutes.get("/incidentalExpense", verifyAssociate, incidentalExpense);
module.exports = { dashbaordRoutes };
