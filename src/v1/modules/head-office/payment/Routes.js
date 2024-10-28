const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport, lot_list, approvedBatchList } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const paymentRoutes = express.Router();

paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.put("/batch-approval", Auth, batchApprove);
paymentRoutes.get("/lot-list", Auth, lot_list);
paymentRoutes.get("/qc-report", Auth, qcReport);
paymentRoutes.get("/approved-batch-list", Auth, approvedBatchList);



// dileep code 

const { orderList, agencyInvoiceById, hoBillApproval, editBillHo, payAgent } = require("./Controller");


paymentRoutes.get('/order-list', Auth, orderList)
paymentRoutes.get("/agency-invoice-byId/:id", Auth, agencyInvoiceById)
paymentRoutes.put("/bill-approval/:id", Auth, hoBillApproval);
paymentRoutes.put("/edit-bill/:id", Auth, editBillHo);
paymentRoutes.get("/pay-agent/:id", Auth, payAgent);


module.exports = { paymentRoutes }; 