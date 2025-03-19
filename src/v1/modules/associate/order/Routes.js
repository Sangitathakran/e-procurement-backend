const express = require("express");
const { batch, viewTrackDelivery, trackDeliveryByBatchId, editTrackDelivery, updateMarkReady,warehouseList } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyAssociate, batch);
orderRoutes.get("/batch", verifyAssociate, viewTrackDelivery);
orderRoutes.get("/batch/:id", verifyAssociate, trackDeliveryByBatchId);
orderRoutes.put("/batch", verifyAssociate, editTrackDelivery);
orderRoutes.put("/update-mark-ready-docs", verifyAssociate, updateMarkReady);
orderRoutes.get("/warehouse-list",verifyAssociate,warehouseList)

module.exports = { orderRoutes }; 