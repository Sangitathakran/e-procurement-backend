const express = require("express");
const { payment, farmerOrders, batch, getFarmerListById, getBill, batchList } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAssociate, payment);
paymentRoutes.get("/farmer-orders", verifyAssociate, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAssociate, batch);
paymentRoutes.get("/batch-list", verifyAssociate, batchList);
paymentRoutes.get("/farmer-details", verifyAssociate, getFarmerListById);
paymentRoutes.get("/bill-view", verifyAssociate, getBill);
module.exports = { paymentRoutes }; 