const express = require("express");
const { getStockData } = require("./Controllers");
const stockRoutes = express.Router()

stockRoutes.get("/get-stock",getStockData)
module.exports = { stockRoutes };

