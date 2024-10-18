const express = require("express");
const warehouseRoutes = express.Router();

const { warehouseList } = require('./Controller');
const { Auth } = require("@src/v1/middlewares/jwt")

warehouseRoutes.get('/',Auth, warehouseList)

module.exports = { warehouseRoutes };

