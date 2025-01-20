const express = require("express");
const { getOrder, getOrderById, deleteOrder, createBatch, deliveryScheduledBatchList, orderDetails } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerOrderRoutes = express.Router();

distillerOrderRoutes.get("/deliveryScheduledBatchList", verifyDistiller, deliveryScheduledBatchList);
distillerOrderRoutes.get("/orderDetails", verifyDistiller, orderDetails);
distillerOrderRoutes.get("/", verifyDistiller, getOrder);
distillerOrderRoutes.get("/:id", verifyDistiller, getOrderById);
distillerOrderRoutes.delete("/:id", verifyDistiller, deleteOrder);
distillerOrderRoutes.post("/batch", verifyDistiller, createBatch);


module.exports = { distillerOrderRoutes }; 