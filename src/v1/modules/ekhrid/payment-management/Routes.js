const express = require("express");
const { getBatches, batchMarkDelivered } = require("./Controllers");

const orderManagementRoutes = express.Router();

orderManagementRoutes.get("/getBatches", getBatches);
orderManagementRoutes.post("/create-order", batchMarkDelivered);

module.exports = { orderManagementRoutes }; 