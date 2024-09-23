const express = require("express");
const { payment, farmerOrders, batch, paymentApprove } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAgent");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAssociate, payment);
paymentRoutes.get("/farmer-orders", verifyAssociate, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAssociate, batch);
requestRoutes.patch("/payment-approval", verifyAssociate, paymentApprove);

module.exports = { paymentRoutes }; 