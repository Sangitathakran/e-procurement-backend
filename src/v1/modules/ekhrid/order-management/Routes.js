const express = require("express");
const {  createOrder, getFarmerOrders } = require("./Controllers");

const orderManagementRoutes = express.Router();

orderManagementRoutes.get("/getFarmerOrders", getFarmerOrders);
orderManagementRoutes.post("/create-order", createOrder);

module.exports = { orderManagementRoutes }; 