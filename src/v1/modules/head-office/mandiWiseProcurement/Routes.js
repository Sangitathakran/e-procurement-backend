// const express = require("express");
// const mandiWiseProcurementRoute = express.Router();
// const { getMandiProcurement  } = require("./Controller");

// mandiWiseProcurementRoute.get("/", getMandiProcurement);
// module.exports = { mandiWiseProcurementRoute };

const express = require("express");
const mandiWiseProcurementRoute = express.Router();

const { getMandiProcurement } = require("./Controller");

// Define your route
mandiWiseProcurementRoute.get("/", getMandiProcurement);

// Export it properly
module.exports = {
  mandiWiseProcurementRoute,
};