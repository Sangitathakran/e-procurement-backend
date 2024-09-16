const express = require("express");
const { payment, farmerOrders, batch } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyJwtToken, payment);
paymentRoutes.get("/farmer-orders", verifyJwtToken, farmerOrders);
paymentRoutes.get("/associate-orders", verifyJwtToken, batch);

module.exports = { paymentRoutes }; 