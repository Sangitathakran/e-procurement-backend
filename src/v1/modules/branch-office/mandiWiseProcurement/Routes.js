const express = require("express");
const { mandiWiseProcurementdata } = require("./Controller");

const mandiWiseProcureRoute = express.Router();

mandiWiseProcureRoute.get("/mandiwiseData", mandiWiseProcurementdata);


module.exports = { mandiWiseProcureRoute };