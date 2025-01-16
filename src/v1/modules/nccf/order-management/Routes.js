const { getOrders, getOrderById, warehouseList, requiredStockUpdate } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOrderRoutes = express.Router();

nccfOrderRoutes.get("/", Auth, getOrders);
nccfOrderRoutes.get('/warehouseList', Auth, warehouseList);
nccfOrderRoutes.get('/:id', Auth, getOrderById);
nccfOrderRoutes.put("/requiredStockUpdate", Auth, requiredStockUpdate);

module.exports = { nccfOrderRoutes }; 
