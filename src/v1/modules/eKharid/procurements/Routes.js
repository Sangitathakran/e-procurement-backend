const express = require("express");
const {
  createProcurementOrder,
  createPaymentSlip,
  getLandData,
} = require("./Controller");

const eKharidHaryanaRoutes = express.Router();

eKharidHaryanaRoutes.post("/add", createProcurementOrder);
eKharidHaryanaRoutes.post("/payment-details", createPaymentSlip);
eKharidHaryanaRoutes.get("/farmer-data", getLandData);

module.exports = { eKharidHaryanaRoutes };
