console.log("Loading ministry routes...");
const express = require("express");
const {dropDownRoutes} = require("./dropDown/Routes")
const { ministrydashboardRoutes } = require("./dashboard/Routes");
const { reportRoutes } = require("./report/Routes");


const ministryRoutes = express.Router();

ministryRoutes.use("/dropDown", dropDownRoutes);
ministryRoutes.use("/dashboard", ministrydashboardRoutes);
ministryRoutes.use("/report", reportRoutes);

module.exports = { ministryRoutes };