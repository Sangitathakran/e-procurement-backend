const express = require("express");
const {  createBatch, getFarmerOrders } = require("./Controllers");

const batchManagementRoutes = express.Router();

// batchManagementRoutes.get("/farmer-order-list", farmerOrderList);
batchManagementRoutes.post("/create-batch", createBatch);

batchManagementRoutes.get("/getFarmerOrders", getFarmerOrders);

module.exports = { batchManagementRoutes }; 