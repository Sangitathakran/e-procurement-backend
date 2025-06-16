const express = require("express");
const mandiWiseProcurementRoute = express.Router();

const { getMandiProcurement, getAssociates } = require("./Controller");

mandiWiseProcurementRoute.get("/", getMandiProcurement);
mandiWiseProcurementRoute.get('/associates', getAssociates);

module.exports = {
  mandiWiseProcurementRoute,
};