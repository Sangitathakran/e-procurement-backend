const express = require("express");
const { associateOrder, viewTrackDelivery } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyJwtToken, associateOrder);
orderRoutes.get("/track-order", verifyJwtToken, viewTrackDelivery);


module.exports = { orderRoutes }; 