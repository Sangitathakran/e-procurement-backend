const express = require("express");
const { createPurchaseOrder, getOrder, getOrderById, updateOrder,deleteOrder } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerOrderRoutes = express.Router();

distillerOrderRoutes.get("/", verifyDistiller, getOrder);
distillerOrderRoutes.get("/:id", verifyDistiller, getOrderById);
distillerOrderRoutes.delete("/:id", verifyDistiller, deleteOrder);
module.exports = { distillerOrderRoutes }; 