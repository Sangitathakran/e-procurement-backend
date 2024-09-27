const express = require("express");
const warehouseRoutes = express.Router();

const { warehouseList } = require('./Controller');
const { verifyAgent } = require("../utils/verifyAgent");

warehouseRoutes.get('/',verifyAgent, warehouseList)

module.exports = { warehouseRoutes };

