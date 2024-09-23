const express = require("express");
const warehouseRoutes = express.Router();

const { warehouseList } = require('./Controller')

warehouseRoutes.get('/', warehouseList)

module.exports = { warehouseRoutes };

