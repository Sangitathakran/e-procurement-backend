const express = require("express");
const { payment, farmerOrders, batch, getFarmerListById } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAssociate, payment);
paymentRoutes.get("/farmer-orders", verifyAssociate, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAssociate, batch);
paymentRoutes.get("/farmer-details", verifyAssociate, getFarmerListById);

module.exports = { paymentRoutes }; 