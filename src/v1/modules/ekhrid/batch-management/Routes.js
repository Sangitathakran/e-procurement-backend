const express = require("express");
const {  createBatch, farmerOrderList } = require("./Controllers");

const batchManagementRoutes = express.Router();
batchManagementRoutes.get("/farmer-order-list", farmerOrderList);
batchManagementRoutes.post("/create-batch", createBatch);
module.exports = { batchManagementRoutes }; 