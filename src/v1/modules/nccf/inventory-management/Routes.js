
const express = require("express");
const { warehouseList, requiredStockUpdate } = require("./Controller");
const nccfInventoryRoutes = express.Router();


nccfInventoryRoutes.get('/warehouseList', warehouseList);
nccfInventoryRoutes.put('/requiredStockUpdate', requiredStockUpdate);



module.exports = { nccfInventoryRoutes }; 
