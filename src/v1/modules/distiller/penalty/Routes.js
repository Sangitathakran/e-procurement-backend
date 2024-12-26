const express = require("express");
const { getPenaltyOrder, getPenaltyById } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerPenaltyRoutes = express.Router();

distillerPenaltyRoutes.get("/", verifyDistiller, getPenaltyOrder);
distillerPenaltyRoutes.get("/:id", verifyDistiller, getPenaltyById);

module.exports = { distillerPenaltyRoutes }; 