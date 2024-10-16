const express = require("express");
const warehouseRoutes = express.Router();

const { warehouseList } = require('./Controller');
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")

warehouseRoutes.get('/',verifyJwtToken, warehouseList)

module.exports = { warehouseRoutes };

