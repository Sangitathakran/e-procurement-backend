
const express = require("express");
const { distillerAuthRoutes } = require("./auth/Routes");
const { distillerpurchaseOrderRoutes } = require("./purchaseOrder/Routes");

const distillerRoutes = express.Router();

distillerRoutes.use("/auth", distillerAuthRoutes);
distillerRoutes.use("/purchaseOrder", distillerpurchaseOrderRoutes);

module.exports = { distillerRoutes }; 