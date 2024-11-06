const express = require("express");
const { payment, farmerOrders, associateOrders, getFarmerListById, getBill, batchList, lotList, paymentLogs, pendingFarmer } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAssociate");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAssociate, payment);
paymentRoutes.get("/farmer-orders", verifyAssociate, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAssociate, associateOrders);
paymentRoutes.get("/batch-list", verifyAssociate, batchList);
paymentRoutes.get("/farmer-details", verifyAssociate, getFarmerListById);
paymentRoutes.get("/bill-view", verifyAssociate, getBill);
paymentRoutes.get("/lot-list", verifyAssociate, lotList);
paymentRoutes.get("/payment-logs", verifyAssociate, paymentLogs);

paymentRoutes.get("/pending-farmer", verifyAssociate, pendingFarmer);

module.exports = { paymentRoutes }; 