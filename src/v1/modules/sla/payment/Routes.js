const express = require("express");
const { payment, associateOrders, batchList, lot_list, AssociateTabPaymentRequests, AssociateTabassociateOrders,
    AssociateTabBatchApprove, AssociateTabGenrateBill, AssociateTabBatchList, associateBillApprove,
    getBill, agentPayments, proceedToPayPaymentRequests, proceedToPayAssociateOrders,
    proceedToPayAssociateTabBatchList, editBill, getBillProceedToPay, agencyBill,
    associateBillReject, editAssociateBill, proceedToPayPayment, proceedToPayPaymentExport, proceedToPayBatchList, paymentLogsHistory, qcReport,
    agentDashboardPaymentList,
    agentDashboardAssociateList,
    paymentWithoutAgreegation, batchApprovalLogs} = require("./Controller");

const { verifyAgent } = require("../utils/verifyAgent");
const { Auth } = require("@src/v1/middlewares/jwt")
const paymentRoutes = express.Router();



//paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.get("/lot-list", Auth, lot_list);

paymentRoutes.get("/agent-req", agentPayments);

paymentRoutes.get("/associate-req", Auth, AssociateTabPaymentRequests);
paymentRoutes.get("/associate-req/associate-orders", Auth, AssociateTabassociateOrders);
paymentRoutes.get("/associate-req/batch-list", Auth, AssociateTabBatchList);

// paymentRoutes.get("/proceed-to-pay", Auth, proceedToPayPaymentRequests);
paymentRoutes.get("/proceed-to-pay", Auth, proceedToPayPayment);
paymentRoutes.get("/proceed-to-pay-export", Auth, proceedToPayPaymentExport);
paymentRoutes.get("/proceed-to-pay-associate-orders", Auth, proceedToPayAssociateOrders);
// paymentRoutes.get("/proceed-to-pay-batch-list", Auth, proceedToPayAssociateTabBatchList);
paymentRoutes.get("/proceed-to-pay-batch-list", Auth, proceedToPayBatchList);

paymentRoutes.get("/associate-req/getbill", Auth, getBill);
paymentRoutes.put("/associate-req/batch-approve", Auth, associateBillApprove);
paymentRoutes.get("/associate-req/genrate-bill", Auth, AssociateTabGenrateBill);
paymentRoutes.get("/proceed-to-pay-bill-view", Auth, getBillProceedToPay);
paymentRoutes.patch("/edit-bill", Auth, editBill);
paymentRoutes.get("/agency-bill", Auth, agencyBill);
paymentRoutes.get('/agent-dashboard-associate-list', agentDashboardAssociateList);
paymentRoutes.get('/agent-dashboard-payment-list', agentDashboardPaymentList);


// reject case
paymentRoutes.put("/associate-req/batch-reject", Auth, associateBillReject);

paymentRoutes.put("/edit-associate-bill/", Auth, editAssociateBill)
paymentRoutes.get("/payment-logs", Auth, paymentLogsHistory);
paymentRoutes.get("/qc-report", Auth, qcReport);

paymentRoutes.get('/', Auth, paymentWithoutAgreegation);
paymentRoutes.get("/batch-approval-logs", Auth, batchApprovalLogs);

module.exports = { paymentRoutes }; 