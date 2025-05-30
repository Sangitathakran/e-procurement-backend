const express = require("express");
const dashbaordRoutes = express.Router();
const { verifyAssociate } = require("../utils/verifyAssociate");

const {
  widgetList,
  dashboardWidgetList, mandiWiseProcurement
} = require("./Controller");

dashbaordRoutes.get("/widget-list", widgetList);
dashbaordRoutes.get("/ho-widget-list", dashboardWidgetList);
dashbaordRoutes.get("/mandiWiseProcurement", verifyAssociate, mandiWiseProcurement);
module.exports = { dashbaordRoutes };
