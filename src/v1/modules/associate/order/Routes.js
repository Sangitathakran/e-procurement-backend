const express = require("express");
const { batch, viewTrackDelivery, trackDeliveryByBatchId, editTrackDelivery } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyAssociate, batch);
orderRoutes.get("/track-order", verifyAssociate, viewTrackDelivery);
orderRoutes.get("/trackDelivery-by-batchId/:id", verifyAssociate, trackDeliveryByBatchId);
orderRoutes.put("/track-delivery", verifyAssociate, editTrackDelivery);


module.exports = { orderRoutes }; 