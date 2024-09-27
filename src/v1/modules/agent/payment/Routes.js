const express = require("express");
const { payment, farmerOrders, batch, paymentApprove, getBill } = require("./Controller");
const { verifyAssociate } = require("../utils/verifyAgent");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAssociate, payment);
paymentRoutes.get("/farmer-orders", verifyAssociate, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAssociate, batch);
paymentRoutes.patch("/payment-approval", verifyAssociate, paymentApprove);
paymentRoutes.patch("/bill-view", verifyAssociate, getBill);
paymentRoutes.get("/proceed-to-pay", verifyAssociate, proceedToPay);

module.exports = { paymentRoutes }; 