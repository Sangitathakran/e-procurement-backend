const express = require("express");
const { payment, paymentLogsHistory, associateOrders, batchList, batchApprove, qcReport, paymentApprove, getBill, lot_list,
     agentPaymentList, agentBill, boBillRejection, verifyOTP, sendOTP, paymentWithoutAggregtion} = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

// paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.put("/batch-approval", Auth, batchApprove);
paymentRoutes.get("/lot-list", Auth, lot_list);
paymentRoutes.get("/qc-report", Auth, qcReport);
paymentRoutes.patch("/payment-approval", Auth, paymentApprove);
paymentRoutes.get("/bill-view", Auth, getBill);
paymentRoutes.get("/agent-payment-list", Auth, agentPaymentList);
paymentRoutes.get("/agent-bill", Auth, agentBill);
paymentRoutes.get("/payment-logs", Auth, paymentLogsHistory);

paymentRoutes.get("/", Auth, paymentWithoutAggregtion);

/// dileep code 

const { orderList , agencyInvoiceById, boBillApproval } = require("./Controller");


paymentRoutes.get('/order-list' ,Auth, orderList)
paymentRoutes.get('/agency-invoice-byId/:id' ,Auth, agencyInvoiceById)
paymentRoutes.put("/bill-approval/:id",Auth, boBillApproval);
paymentRoutes.post("/send-otp", Auth, sendOTP);
paymentRoutes.post("/verify-otp", Auth, verifyOTP);

// agent bill rejection case 
paymentRoutes.put("/bill-reject", Auth, boBillRejection)


module.exports = { paymentRoutes }; 