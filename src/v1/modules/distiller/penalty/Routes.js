const express = require("express");
const { getPenaltyOrder, getPenaltyById } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerOrderRoutes = express.Router();

distillerOrderRoutes.get("/", verifyDistiller, getPenaltyOrder);
distillerOrderRoutes.get("/:id", verifyDistiller, getPenaltyById);

module.exports = { distillerOrderRoutes }; 