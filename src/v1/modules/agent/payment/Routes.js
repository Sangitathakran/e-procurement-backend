const express = require("express");
const { payment, farmerOrders, associateOrders, batchList, paymentApprove, getBill, lot_list, proceedToPay, associateOrdersProceedToPay, batchListProceedToPay, getBillProceedToPay, paymentEdit, paymentLogs, batchApprove, generateBill, agentPaymentList, agentBill, agentPaymentEdit, agentPaymentLogs } = require("./Controller");
const { verifyAgent } = require("../utils/verifyAgent");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyAgent, payment);
paymentRoutes.get("/associate-orders", verifyAgent, associateOrders);
paymentRoutes.get("/batch-list", verifyAgent, batchList);
paymentRoutes.get("/lot-list", verifyAgent, lot_list);
paymentRoutes.get("/farmer-orders", verifyAgent, farmerOrders);
paymentRoutes.patch("/payment-approval", verifyAgent, paymentApprove);
paymentRoutes.get("/bill-view", verifyAgent, getBill);

paymentRoutes.get("/proceed-to-pay", verifyAgent, proceedToPay);
paymentRoutes.get("/proceed-to-pay-associate-orders", verifyAgent, associateOrdersProceedToPay);
paymentRoutes.get("/proceed-to-pay-batch-list", verifyAgent, batchListProceedToPay);
paymentRoutes.get("/proceed-to-pay-bill-view", verifyAgent, getBillProceedToPay);
paymentRoutes.get("/batch-approval", verifyAgent, batchApprove);
paymentRoutes.put("/payment-edit", verifyAgent, paymentEdit);
paymentRoutes.get("/payment-logs", verifyAgent, paymentLogs);
paymentRoutes.post("/generate-bill", verifyAgent, generateBill);

paymentRoutes.get("/agent-payment-list", verifyAgent, agentPaymentList);
paymentRoutes.get("/agent-bill", verifyAgent, agentBill);
paymentRoutes.put("/agent-payment-edit", verifyAgent, agentPaymentEdit);
paymentRoutes.get("/agent-payment-logs", verifyAgent, agentPaymentLogs);

module.exports = { paymentRoutes }; 