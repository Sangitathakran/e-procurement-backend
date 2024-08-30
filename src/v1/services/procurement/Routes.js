
const express = require("express");
// const { sellerOfferRoutes } = require("./seller/Routes");
const { requestRoutes } = require("./request/Routes");
const { centerRoutes } = require("./collection_center/Routes");
const procurementRoutes = express.Router();

procurementRoutes.use("/request", requestRoutes);
procurementRoutes.use("/center", centerRoutes);
module.exports = { procurementRoutes}; 