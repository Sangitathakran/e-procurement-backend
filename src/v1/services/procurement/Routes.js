
const express = require("express");
const { requestRoutes } = require("./request/Routes");
const { centerRoutes } = require("./collection_center/Routes");
const { orderRoutes } = require("./order/Routes");
const procurementRoutes = express.Router();

procurementRoutes.use("/request", requestRoutes);
procurementRoutes.use("/center", centerRoutes);
procurementRoutes.use("/order", orderRoutes);


module.exports = { procurementRoutes }; 