
const express = require("express");
const { warehouseList, requiredStockUpdate } = require("./Controller");
const nccfInventoryRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");

nccfInventoryRoutes.get('/warehouseList', Auth, warehouseList);
nccfInventoryRoutes.put('/requiredStockUpdate', Auth, requiredStockUpdate);



module.exports = { nccfInventoryRoutes }; 
