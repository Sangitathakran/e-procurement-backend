const { getOrders, getOrderById, warehouseList, updateMouApprovalStatus } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOrderRoutes = express.Router();

nccfOrderRoutes.get("/", getOrders);
nccfOrderRoutes.get('/warehouseList', warehouseList);
nccfOrderRoutes.get('/:id', getOrderById);

nccfOrderRoutes.patch("/or-approval", updateMouApprovalStatus);

module.exports = { nccfOrderRoutes }; 
