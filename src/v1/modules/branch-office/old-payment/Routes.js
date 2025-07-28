const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport, paymentApprove, getBill, lot_list, agentPaymentList, agentBill, boBillRejection, verifyOTP, sendOTP} = require("./Controller");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
const paymentRoutes = express.Router();

paymentRoutes.get("/",authenticateUser,authorizeRoles(_userType.bo), Auth, payment);
paymentRoutes.get("/associate-orders",authenticateUser,authorizeRoles(_userType.bo), Auth, associateOrders);
paymentRoutes.get("/batch-list",authenticateUser,authorizeRoles(_userType.bo), Auth, batchList);
paymentRoutes.put("/batch-approval",authenticateUser,authorizeRoles(_userType.bo), Auth, batchApprove);
paymentRoutes.get("/lot-list",authenticateUser,authorizeRoles(_userType.bo), Auth, lot_list);
paymentRoutes.get("/qc-report",authenticateUser,authorizeRoles(_userType.bo), Auth, qcReport);
paymentRoutes.patch("/payment-approval",authenticateUser,authorizeRoles(_userType.bo), Auth, paymentApprove);
paymentRoutes.get("/bill-view",authenticateUser,authorizeRoles(_userType.bo), Auth, getBill);
paymentRoutes.get("/agent-payment-list",authenticateUser,authorizeRoles(_userType.bo), Auth, agentPaymentList);
paymentRoutes.get("/agent-bill",authenticateUser,authorizeRoles(_userType.bo), Auth, agentBill);


/// dileep code 

const { orderList , agencyInvoiceById, boBillApproval } = require("./Controller")


paymentRoutes.get('/order-list' ,Auth, orderList)
paymentRoutes.get('/agency-invoice-byId/:id' ,Auth, agencyInvoiceById)
paymentRoutes.put("/bill-approval/:id",Auth, boBillApproval);
paymentRoutes.post("/send-otp", Auth, sendOTP);
paymentRoutes.post("/verify-otp", Auth, verifyOTP);

// agent bill rejection case 
paymentRoutes.put("/bill-reject", Auth, boBillRejection)


module.exports = { paymentRoutes }; 