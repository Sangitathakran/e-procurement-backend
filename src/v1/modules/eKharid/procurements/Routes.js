const express = require("express");
const { createProcurementOrder, createPaymentSlip } = require("./Controller");

const eKharidHaryanaRoutes = express.Router();

eKharidHaryanaRoutes.post("/add", createProcurementOrder);
eKharidHaryanaRoutes.post("/payment-details", createPaymentSlip);

module.exports = { eKharidHaryanaRoutes };
