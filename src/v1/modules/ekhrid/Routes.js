const express = require("express");
// const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { batchManagementRoutes } = require("./batch-management/Routes");
const { orderManagementRoutes } = require("./payment-management/Routes");
const { warehouseRoutes } = require("./warehouseUpdate/Routes");

const ekhridRoutes = express.Router();

ekhridRoutes.use("/associate", associateMngmntRoutes);
ekhridRoutes.use("/batch", batchManagementRoutes);
ekhridRoutes.use("/order", orderManagementRoutes);
ekhridRoutes.use("/warehouse", warehouseRoutes);

module.exports = { ekhridRoutes } 