
const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { procurementCenterRoutes } = require("./procurement_center/Routes");
const { orderRoutes } = require("./order/Routes");
const { paymentRoutes } = require("./payment/Routes");
const { userAuthRoutes } = require("./auth/Routes");
const { whrRoutes } = require("./whr/Routes");
const associateRoutes = express.Router();


associateRoutes.use("/request", requestRoutes);
associateRoutes.use("/center", procurementCenterRoutes);
associateRoutes.use("/order", orderRoutes);
associateRoutes.use("/payment", paymentRoutes);
associateRoutes.use("/whr", whrRoutes);
associateRoutes.use("/auth", userAuthRoutes);


module.exports = { associateRoutes }; 