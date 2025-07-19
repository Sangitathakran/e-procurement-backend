const express = require("express");
const {  createBatch, getFarmerOrders, getWarehouseTesting,getMissingBatch } = require("./Controllers");

const batchManagementRoutes = express.Router();

// batchManagementRoutes.get("/farmer-order-list", farmerOrderList);
batchManagementRoutes.post("/create-batch", createBatch);

batchManagementRoutes.post("/getFarmerOrders", getFarmerOrders);
batchManagementRoutes.get("/getMissingBatch", getMissingBatch);

batchManagementRoutes.get("/getWarehouseTesting", getWarehouseTesting);

module.exports = { batchManagementRoutes }; 