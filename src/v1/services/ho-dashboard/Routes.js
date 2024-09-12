const express = require("express");
const hoDashboardRoutes = express.Router();

const {widgetList } = require("./Controller");

hoDashboardRoutes.get('/widget-list',widgetList);

module.exports = { hoDashboardRoutes };
