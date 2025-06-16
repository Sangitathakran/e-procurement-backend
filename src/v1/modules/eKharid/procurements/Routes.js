const express = require("express");
const {
  createProcurementOrder,
  createPaymentSlip,
  getLandData,
  updateWarehouseData,
} = require("./Controller");

const eKharidHaryanaRoutes = express.Router();

eKharidHaryanaRoutes.post("/add", createProcurementOrder);
eKharidHaryanaRoutes.post("/payment-details", createPaymentSlip);
eKharidHaryanaRoutes.get("/farmer-data", getLandData); // this is experimental API, can be used if required
eKharidHaryanaRoutes.post("/warehouse-details", updateWarehouseData);

module.exports = { eKharidHaryanaRoutes };
