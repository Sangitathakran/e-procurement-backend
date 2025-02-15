const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport, lot_list, approvedBatchList, payFarmers, updatePaymentByOrderId, sendOTP, verifyOTPProceed,verifyOTPApproval } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.put("/batch-approval", Auth, batchApprove);
paymentRoutes.get("/lot-list", Auth, lot_list);
paymentRoutes.get("/qc-report", Auth, qcReport);
paymentRoutes.get("/approved-batch-list", Auth, approvedBatchList);
paymentRoutes.post("/pay-farmers", Auth, payFarmers)
paymentRoutes.put("/update-payment-status", Auth, updatePaymentByOrderId)



// dileep code 

const { orderList, agencyInvoiceById, hoBillApproval, editBillHo, payAgent, hoBillRejection } = require("./Controller");


paymentRoutes.get('/order-list', Auth, orderList)
paymentRoutes.get("/agency-invoice-byId/:id", Auth, agencyInvoiceById)
paymentRoutes.put("/bill-approval/:id", Auth, hoBillApproval);
paymentRoutes.put("/edit-bill/:id", Auth, editBillHo);
paymentRoutes.get("/pay-agent/:id", Auth, payAgent);
paymentRoutes.post("/send-otp", Auth, sendOTP);
paymentRoutes.post("/verify-otp-approval", Auth, verifyOTPApproval);
paymentRoutes.post("/verify-otp-proceed", Auth, verifyOTPProceed);


//ho bill rejection case
paymentRoutes.put("/bill-reject", Auth, hoBillRejection)


module.exports = { paymentRoutes }; 