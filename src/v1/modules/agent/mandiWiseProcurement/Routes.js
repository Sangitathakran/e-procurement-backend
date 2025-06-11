const express = require("express");
const mandiWiseProcurementRoute = express.Router();

const { getMandiProcurement } = require("./Controller");

mandiWiseProcurementRoute.get("/", getMandiProcurement);

module.exports = {
  mandiWiseProcurementRoute,
};