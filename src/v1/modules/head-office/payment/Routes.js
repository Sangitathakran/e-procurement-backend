const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.put("/batch-approval", Auth, batchApprove);
paymentRoutes.get("/lot-list", Auth, lot_list);
paymentRoutes.get("/qc-report", Auth, qcReport);
// paymentRoutes.patch("/payment-approval", Auth, paymentApprove);
// paymentRoutes.get("/bill-view", Auth, getBill);
// paymentRoutes.get("/agent-payment-list", Auth, agentPaymentList);
// paymentRoutes.get("/agent-bill", Auth, agentBill);

module.exports = { paymentRoutes }; 