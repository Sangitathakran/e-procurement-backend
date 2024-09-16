const express = require("express");
const { batch, viewTrackDelivery, trackDeliveryByBatchId,editTrackDelivery } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyJwtToken, batch);
orderRoutes.get("/track-order", verifyJwtToken, viewTrackDelivery);
orderRoutes.get("/trackDelivery-by-batchId", verifyJwtToken, trackDeliveryByBatchId);
orderRoutes.put("/track-delivery", verifyJwtToken, editTrackDelivery);


module.exports = { orderRoutes }; 