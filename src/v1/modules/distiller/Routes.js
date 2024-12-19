
const express = require("express");
const { distillerAuthRoutes } = require("./auth/Routes");
const { distillerpurchaseOrderRoutes } = require("./purchaseOrder/Routes");
const { distillerOrderRoutes } = require("./order/Routes");
const { distillerWarehouseRoutes } = require("./warehouse/Routes");

const distillerRoutes = express.Router();

distillerRoutes.use("/auth", distillerAuthRoutes);
distillerRoutes.use("/purchaseOrder", distillerpurchaseOrderRoutes);
distillerRoutes.use("/order", distillerOrderRoutes);
distillerRoutes.use("/warehouse", distillerWarehouseRoutes);
module.exports = { distillerRoutes }; 