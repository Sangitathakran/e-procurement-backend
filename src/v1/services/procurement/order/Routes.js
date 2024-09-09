const express = require("express");
const { associateOrder, viewTrackDelivery, trackDeliveryByBatchId,editTrackDelivery } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyJwtToken, associateOrder);
orderRoutes.get("/track-order", verifyJwtToken, viewTrackDelivery);
orderRoutes.get("/trackDelivery-by-batchId", verifyJwtToken, trackDeliveryByBatchId);
orderRoutes.put("/track-delivery", verifyJwtToken, editTrackDelivery);


module.exports = { orderRoutes }; 