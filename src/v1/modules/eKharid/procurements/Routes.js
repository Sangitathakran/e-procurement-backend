const express = require("express");
const { createProcurementOrder, createPaymentSlip, listProcurementOrder } = require("./Controller");

const eKharidHaryanaRoutes = express.Router();

eKharidHaryanaRoutes.post("/add", createProcurementOrder);
eKharidHaryanaRoutes.post("/payment-details", createPaymentSlip);
eKharidHaryanaRoutes.get("/", listProcurementOrder);

module.exports = { eKharidHaryanaRoutes };
