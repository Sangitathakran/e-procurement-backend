const express = require("express");
const { associateOrder, editTrackDelivery } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const orderRoutes = express.Router();

orderRoutes.post("/associate-order", verifyJwtToken, associateOrder);
orderRoutes.put("/track-delivery", verifyJwtToken, editTrackDelivery);


module.exports = { orderRoutes }; 