
const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { orderRoutes } = require("./order/Routes");
const { paymentRoutes } = require("./payment/Routes");
const { userAuthRoutes } = require("./auth/Routes");
const { dashbaordRoutes } = require("./dashboard/Routes");

const associateRoutes = express.Router();


associateRoutes.use("/request", requestRoutes);
associateRoutes.use("/center", procurementCenterRoutes);
associateRoutes.use("/order", orderRoutes);
associateRoutes.use("/payment", paymentRoutes);
associateRoutes.use("/auth", userAuthRoutes);
associateRoutes.use("/dashbaord", dashbaordRoutes);

module.exports = { associateRoutes }; 