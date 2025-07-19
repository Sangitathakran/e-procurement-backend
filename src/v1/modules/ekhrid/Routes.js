const express = require("express");
// const { requestRoutes } = require("./request/Routes");
const { associateMngmntRoutes } = require("./associate-management/Routes");
const { batchManagementRoutes } = require("./batch-management/Routes");
const { orderManagementRoutes } = require("./payment-management/Routes");
const { warehouseRoutes } = require("./warehouseUpdate/Routes");
const { batchCreated, farmerOfferCreated, paymentCreated } = require("./proccessJob/job");

const ekhridRoutes = express.Router();

ekhridRoutes.use("/associate", associateMngmntRoutes);
ekhridRoutes.use("/batch", batchManagementRoutes);
ekhridRoutes.use("/order", orderManagementRoutes);
ekhridRoutes.use("/warehouse", warehouseRoutes);
ekhridRoutes.get('/farmerOffer-job',farmerOfferCreated)
ekhridRoutes.get('/batch-job',batchCreated)
ekhridRoutes.get('/payment-job',paymentCreated)

module.exports = { ekhridRoutes } 