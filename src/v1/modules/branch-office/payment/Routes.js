const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport, paymentApprove, getBill, lot_list, agentPaymentList, agentBill} = require("./Controller");
const { verifyBO } = require("../utils/verifyBO");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyBO, payment);
paymentRoutes.get("/associate-orders", verifyBO, associateOrders);
paymentRoutes.get("/batch-list", verifyBO, batchList);
paymentRoutes.put("/batch-approval", verifyBO, batchApprove);
paymentRoutes.get("/lot-list", verifyAgent, lot_list);
paymentRoutes.get("/qc-report", verifyBO, qcReport);
paymentRoutes.patch("/payment-approval", verifyBO, paymentApprove);
paymentRoutes.get("/bill-view", verifyBO, getBill);
paymentRoutes.get("/agent-payment-list", verifyBO, agentPaymentList);
paymentRoutes.get("/agent-bill", verifyBO, agentBill);

module.exports = { paymentRoutes }; 