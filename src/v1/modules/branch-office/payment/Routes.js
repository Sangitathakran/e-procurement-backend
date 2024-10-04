const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport, paymentApprove, getBill} = require("./Controller");
const { verifyBO } = require("../utils/verifyBO");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyBO, payment);
paymentRoutes.get("/associate-orders", verifyBO, associateOrders);
paymentRoutes.get("/batch-list", verifyBO, batchList);
paymentRoutes.get("/batch-approval", verifyBO, batchApprove);
paymentRoutes.get("/qc-report", verifyBO, qcReport);
paymentRoutes.patch("/payment-approval", verifyBO, paymentApprove);
paymentRoutes.get("/bill-view", verifyBO, getBill);

module.exports = { paymentRoutes }; 