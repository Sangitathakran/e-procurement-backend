const express = require("express");
const distillerWarehouseRoutes = express.Router();

const { warehouseList } = require('./Controller');
const { Auth } = require("@src/v1/middlewares/jwt")

distillerWarehouseRoutes.get('/',Auth, warehouseList)

module.exports = { distillerWarehouseRoutes };