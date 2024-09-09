const express = require("express");
const { associateOrder, editTrackDelivery, viewTrackDelivery } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyJwtToken, associateOrder);
orderRoutes.get("/track-order", verifyJwtToken, viewTrackDelivery);
orderRoutes.put("/track-delivery", verifyJwtToken, editTrackDelivery);


module.exports = { orderRoutes }; 