const { getOrders, getOrderById, warehouseList, requiredStockUpdate } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOrderRoutes = express.Router();

nccfOrderRoutes.get("/", getOrders);
nccfOrderRoutes.get('/warehouseList', warehouseList);
nccfOrderRoutes.get('/:id', getOrderById);
nccfOrderRoutes.put("/requiredStockUpdate", requiredStockUpdate);

module.exports = { nccfOrderRoutes }; 
