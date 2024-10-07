const express = require("express");
const warehouseRoutes = express.Router();

const { warehouseList } = require('./Controller');
const { verifyBO } = require("../utils/verifyBO");

warehouseRoutes.get('/',verifyBO, warehouseList)

module.exports = { warehouseRoutes };