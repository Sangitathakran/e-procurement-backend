const express = require("express");
const hoDashboardRoutes = express.Router();

const { widgetList ,farmerPayments} = require("./Controller");

hoDashboardRoutes.get("/widget-list", widgetList);
hoDashboardRoutes.get("/farmer-payments",farmerPayments)

module.exports = { hoDashboardRoutes };
