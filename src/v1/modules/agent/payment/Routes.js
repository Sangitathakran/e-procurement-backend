const express = require("express");
const { payment, farmerOrders, associateOrders, paymentApprove, getBill, proceedToPay, associateOrdersProceedToPay, batchListProceedToPay, getBillProceedToPay } = require("./Controller");
const { verifyAgent } = require("../utils/verifyAgent");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAgent, payment);
paymentRoutes.get("/associate-orders", verifyAgent, associateOrders);
paymentRoutes.get("/farmer-orders", verifyAgent, farmerOrders);
paymentRoutes.patch("/payment-approval", verifyAgent, paymentApprove);
paymentRoutes.get("/bill-view", verifyAgent, getBill);

paymentRoutes.get("/proceed-to-pay", verifyAgent, proceedToPay);
paymentRoutes.get("/proceed-to-pay-associate-orders", verifyAgent, associateOrdersProceedToPay);
paymentRoutes.get("/proceed-to-pay-batch-list", verifyAgent, batchListProceedToPay);
paymentRoutes.get("/proceed-to-pay-bill-view", verifyAgent, getBillProceedToPay);

module.exports = { paymentRoutes }; 