console.log("Loading ministry routes...");
const express = require("express");
const { distillerAuthRoutes } = require("./auth/Routes");
const {dropDownRoutes} = require("./dropDown/Routes")
const { ministrydashboardRoutes } = require("./dashboard/Routes");

const ministryRoutes = express.Router();

ministryRoutes.use("/auth", distillerAuthRoutes);
ministryRoutes.use("/dropDown", dropDownRoutes);
ministryRoutes.use("/dashboard", ministrydashboardRoutes);


module.exports = { ministryRoutes };