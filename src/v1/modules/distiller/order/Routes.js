const express = require("express");
const { getOrder, getOrderById, deleteOrder, createBatch, deliveryScheduledBatchList, orderDetails, batchPayNow } = require("./Controller");
const { verifyDistiller } = require("../utils/verifyDistiller");
const distillerOrderRoutes = express.Router();

distillerOrderRoutes.get("/deliveryScheduledBatchList", verifyDistiller, deliveryScheduledBatchList);
distillerOrderRoutes.get("/orderDetails", verifyDistiller, orderDetails);
distillerOrderRoutes.get("/", verifyDistiller, getOrder);
distillerOrderRoutes.put("/batchPayNow", verifyDistiller, batchPayNow);
distillerOrderRoutes.get("/:id", verifyDistiller, getOrderById);
distillerOrderRoutes.delete("/:id", verifyDistiller, deleteOrder);
distillerOrderRoutes.post("/batch", verifyDistiller, createBatch);
distillerOrderRoutes.put("/batchPayNow", verifyDistiller, batchPayNow);



module.exports = { distillerOrderRoutes }; 