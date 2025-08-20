const express = require("express");
const { payment, paymentLogsHistory, associateOrders, batchList, batchApprove, qcReport, paymentApprove, getBill, lot_list, agentPaymentList, agentBill, boBillRejection, verifyOTP, sendOTP, paymentWithoutAggregtion, paymentWithoutAggregtionExport, reSendOtp, batchApprovalLogs } = require("./Controller");
const { _userType } = require("@src/v1/utils/constants/index")
const { Auth, authenticateUser, authorizeRoles, } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

// paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", authenticateUser, authorizeRoles(_userType.bo), Auth, associateOrders);
paymentRoutes.get("/batch-list", authenticateUser, authorizeRoles(_userType.bo), Auth, batchList);
paymentRoutes.put("/batch-approval", authenticateUser, authorizeRoles(_userType.bo), Auth, batchApprove);
paymentRoutes.get("/lot-list", authenticateUser, authorizeRoles(_userType.bo), Auth, lot_list);
paymentRoutes.get("/qc-report", authenticateUser, authorizeRoles(_userType.bo), Auth, qcReport);
paymentRoutes.patch("/payment-approval", authenticateUser, authorizeRoles(_userType.bo), Auth, paymentApprove);
paymentRoutes.get("/bill-view", authenticateUser, authorizeRoles(_userType.bo), Auth, getBill);
paymentRoutes.get("/agent-payment-list", authenticateUser, authorizeRoles(_userType.bo), Auth, agentPaymentList);
paymentRoutes.get("/agent-bill", authenticateUser, authorizeRoles(_userType.bo), Auth, agentBill);
paymentRoutes.get("/payment-logs", authenticateUser, authorizeRoles(_userType.bo), Auth, paymentLogsHistory);

paymentRoutes.get("/", authenticateUser, authorizeRoles(_userType.bo), Auth, paymentWithoutAggregtion);
paymentRoutes.get("/payment-export", Auth, paymentWithoutAggregtionExport);

/// dileep code 

const { orderList, agencyInvoiceById, boBillApproval } = require("./Controller");


paymentRoutes.get('/order-list', authenticateUser, authorizeRoles(_userType.bo), Auth, orderList)
paymentRoutes.get('/agency-invoice-byId/:id', authenticateUser, authorizeRoles(_userType.bo), Auth, agencyInvoiceById)
paymentRoutes.put("/bill-approval/:id", authenticateUser, authorizeRoles(_userType.bo), Auth, boBillApproval);
paymentRoutes.post("/send-otp", authenticateUser, authorizeRoles(_userType.bo), Auth, sendOTP);
paymentRoutes.post("/verify-otp", authenticateUser, authorizeRoles(_userType.bo), Auth, verifyOTP);
paymentRoutes.post("/reSend-otp", authenticateUser, authorizeRoles(_userType.bo), Auth, reSendOtp);
// agent bill rejection case 
paymentRoutes.put("/bill-reject", authenticateUser, authorizeRoles(_userType.bo), Auth, boBillRejection)
paymentRoutes.get("/batch-approval-logs", Auth, batchApprovalLogs);

module.exports = { paymentRoutes }; 