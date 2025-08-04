const express = require("express");
const mandiWiseProcurementRoute = express.Router();

const { getMandiProcurement, getAssociates, getState } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

mandiWiseProcurementRoute.get("/", Auth, getMandiProcurement);
mandiWiseProcurementRoute.get('/associates', Auth,  getAssociates);
mandiWiseProcurementRoute.get('/state', Auth, getState);

module.exports = {
  mandiWiseProcurementRoute,
};