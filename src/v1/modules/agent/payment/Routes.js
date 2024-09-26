const express = require("express");
const { payment, farmerOrders, associateOrders, paymentApprove, getBill, farmerOrdersProceedToPay, associateOrdersProceedToPay, batchListProceedToPay, getBillProceedToPay } = require("./Controller");
const { verifyAgent } = require("../utils/verifyAgent");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAgent, payment);
paymentRoutes.get("/farmer-orders", verifyAgent, farmerOrders);
paymentRoutes.get("/associate-orders", verifyAgent, associateOrders);
paymentRoutes.patch("/payment-approval", verifyAgent, paymentApprove);
paymentRoutes.patch("/bill-view", verifyAgent, getBill);
paymentRoutes.get("/proceed-to-pay", verifyAgent, proceedToPay);

paymentRoutes.get("/proceed-to-pay-farmer-orders", verifyAgent, farmerOrdersProceedToPay);
paymentRoutes.get("/proceed-to-pay-associate-orders", verifyAgent, associateOrdersProceedToPay);
paymentRoutes.get("/proceed-to-pay-batch-list", verifyAgent, batchListProceedToPay);
paymentRoutes.get("/proceed-to-pay-bill-view", verifyAssociate, getBillProceedToPay);

module.exports = { paymentRoutes }; 