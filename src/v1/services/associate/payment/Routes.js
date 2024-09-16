const express = require("express");
const { payment, farmerOrders, batch } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAssociate, payment);
paymentRoutes.get("/farmer-orders", verifyAssociate, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAssociate, batch);

module.exports = { paymentRoutes }; 