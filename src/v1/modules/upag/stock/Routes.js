const express = require("express");
const { getStockData, postStockData } = require("./Controllers");
const { authMiddleware } = require("../auth/Controllers");
const { validateStock } = require("@src/v1/middlewares/upag_validations");
const stockRoutes = express.Router()

stockRoutes.get("/get-stock",authMiddleware,getStockData)
stockRoutes.post('/stock', postStockData );
module.exports = { stockRoutes };

