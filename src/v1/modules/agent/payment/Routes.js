const express = require("express");
const { payment, farmerOrders, associateOrders, batchList, paymentApprove, getBill, lot_list, proceedToPay, associateOrdersProceedToPay, batchListProceedToPay, getBillProceedToPay, paymentEdit, paymentLogs, batchApprove, generateBill, agentPaymentList, agentBill, agentPaymentEdit, agentPaymentLogs } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyJwtToken, payment);
paymentRoutes.get("/associate-orders", verifyJwtToken, associateOrders);
paymentRoutes.get("/batch-list", verifyJwtToken, batchList);
paymentRoutes.get("/lot-list", verifyJwtToken, lot_list);
paymentRoutes.get("/farmer-orders", verifyJwtToken, farmerOrders);
paymentRoutes.patch("/payment-approval", verifyJwtToken, paymentApprove);
paymentRoutes.get("/bill-view", verifyJwtToken, getBill);

paymentRoutes.get("/proceed-to-pay", verifyJwtToken, proceedToPay);
paymentRoutes.get("/proceed-to-pay-associate-orders", verifyJwtToken, associateOrdersProceedToPay);
paymentRoutes.get("/proceed-to-pay-batch-list", verifyJwtToken, batchListProceedToPay);
paymentRoutes.get("/proceed-to-pay-bill-view", verifyJwtToken, getBillProceedToPay);
paymentRoutes.put("/batch-approval", verifyJwtToken, batchApprove);
paymentRoutes.put("/payment-edit", verifyJwtToken, paymentEdit);
paymentRoutes.get("/payment-logs", verifyJwtToken, paymentLogs);
paymentRoutes.post("/generate-bill", verifyJwtToken, generateBill);

paymentRoutes.get("/agent-payment-list", verifyJwtToken, agentPaymentList);
paymentRoutes.get("/agent-bill", verifyJwtToken, agentBill);
paymentRoutes.put("/agent-payment-edit", verifyJwtToken, agentPaymentEdit);
paymentRoutes.get("/agent-payment-logs", verifyJwtToken, agentPaymentLogs);

module.exports = { paymentRoutes }; 