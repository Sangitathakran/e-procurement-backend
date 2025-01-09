const { getOrders, getOrderById,  updateMouApprovalStatus } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOrderRoutes = express.Router();

nccfOrderRoutes.get("/", getOrders);
nccfOrderRoutes.get('/:id', getOrderById);
nccfOrderRoutes.patch("/mou-approval", updateMouApprovalStatus);

module.exports = { nccfOrderRoutes }; 
