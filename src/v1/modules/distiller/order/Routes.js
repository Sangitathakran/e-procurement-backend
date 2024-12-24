const express = require("express");
const { createPurchaseOrder, getOrder, getOrderById, deleteOrder, createBatch } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerOrderRoutes = express.Router();

distillerOrderRoutes.get("/", verifyDistiller, getOrder);
distillerOrderRoutes.get("/:id", verifyDistiller, getOrderById);
distillerOrderRoutes.delete("/:id", verifyDistiller, deleteOrder);
distillerOrderRoutes.post("/batch", verifyDistiller, createBatch);

module.exports = { distillerOrderRoutes }; 