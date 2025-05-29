const express = require("express");
const {
  createProcurementOrder,
  createPaymentSlip,
  getLandData,
  updateWarehouseData,
  listProcurementOrder,
  updateIformData
} = require("./Controller");

const eKharidHaryanaRoutes = express.Router();

eKharidHaryanaRoutes.post("/add", createProcurementOrder);
eKharidHaryanaRoutes.post("/payment-details", createPaymentSlip);
eKharidHaryanaRoutes.get("/farmer-data", getLandData); // this is experimental API, can be used if required
eKharidHaryanaRoutes.post("/warehouse-details", updateWarehouseData);
eKharidHaryanaRoutes.get("/", listProcurementOrder);
eKharidHaryanaRoutes.post("/iform-details", updateIformData);

module.exports = { eKharidHaryanaRoutes };
