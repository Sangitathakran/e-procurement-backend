const { getOrders, batchList, getOrderById, warehouseList, requiredStockUpdate, batchstatusUpdate } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOrderRoutes = express.Router();

nccfOrderRoutes.get("/", Auth, getOrders);
nccfOrderRoutes.get("/batchList", Auth, batchList);
nccfOrderRoutes.get('/warehouseList', Auth, warehouseList);
nccfOrderRoutes.get('/:id', Auth, getOrderById);
nccfOrderRoutes.put("/requiredStockUpdate", Auth, requiredStockUpdate);
nccfOrderRoutes.put("/batchstatusUpdate", Auth, batchstatusUpdate);

module.exports = { nccfOrderRoutes }; 
