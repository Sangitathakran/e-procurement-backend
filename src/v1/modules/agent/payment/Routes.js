const express = require("express");
const { payment, farmerOrders, associateOrders, batchList, paymentApprove, getBill, lot_list, proceedToPay, associateOrdersProceedToPay, batchListProceedToPay, getBillProceedToPay, paymentEdit, paymentLogs, batchApprove, generateBill, agentPaymentList, agentBill, agentPaymentEdit, agentPaymentLogs } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.get("/lot-list", Auth, lot_list);
paymentRoutes.get("/farmer-orders", Auth, farmerOrders);
paymentRoutes.patch("/payment-approval", Auth, paymentApprove);
paymentRoutes.get("/bill-view", Auth, getBill);

paymentRoutes.get("/proceed-to-pay", Auth, proceedToPay);
paymentRoutes.get("/proceed-to-pay-associate-orders", Auth, associateOrdersProceedToPay);
paymentRoutes.get("/proceed-to-pay-batch-list", Auth, batchListProceedToPay);
paymentRoutes.get("/proceed-to-pay-bill-view", Auth, getBillProceedToPay);
paymentRoutes.put("/batch-approval", Auth, batchApprove);
paymentRoutes.put("/payment-edit", Auth, paymentEdit);
paymentRoutes.get("/payment-logs", Auth, paymentLogs);
paymentRoutes.post("/generate-bill", Auth, generateBill);

paymentRoutes.get("/agent-payment-list", Auth, agentPaymentList);
paymentRoutes.get("/agent-bill", Auth, agentBill);
paymentRoutes.put("/agent-payment-edit", Auth, agentPaymentEdit);
paymentRoutes.get("/agent-payment-logs", Auth, agentPaymentLogs);

module.exports = { paymentRoutes }; 