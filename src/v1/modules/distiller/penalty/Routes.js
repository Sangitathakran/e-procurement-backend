const express = require("express");
const { getPenaltyOrder, batchList } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerPenaltyRoutes = express.Router();


distillerPenaltyRoutes.get("/", verifyDistiller, getPenaltyOrder);
distillerPenaltyRoutes.get("/batchList", verifyDistiller, batchList);

module.exports = { distillerPenaltyRoutes }; 
