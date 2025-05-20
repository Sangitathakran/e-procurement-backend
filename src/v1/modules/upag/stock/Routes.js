const express = require("express");
const { getStockData } = require("./Controllers");
const { authMiddleware } = require("../auth/Controllers");
const stockRoutes = express.Router()

stockRoutes.get("/get-stock",authMiddleware,getStockData)
module.exports = { stockRoutes };

