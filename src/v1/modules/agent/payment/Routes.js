const express = require("express");
const { payment, associateOrders, batchList, lot_list, AssociateTabPaymentRequests, AssociateTabassociateOrders, AssociateTabBatchApprove, AssociateTabGenrateBill, AssociateTabBatchList, associateBillApprove, } = require("./Controller");
const { verifyAgent } = require("../utils/verifyAgent");
const { Auth } = require("@src/v1/middlewares/jwt")
const paymentRoutes = express.Router();

paymentRoutes.get("/", Auth, payment);
paymentRoutes.get("/associate-orders", Auth, associateOrders);
paymentRoutes.get("/batch-list", Auth, batchList);
paymentRoutes.get("/lot-list", Auth, lot_list);

paymentRoutes.get("/associate-req", Auth, AssociateTabPaymentRequests);
paymentRoutes.get("/associate-req/associate-orders", Auth, AssociateTabassociateOrders);
paymentRoutes.get("/associate-req/batch-list", Auth, AssociateTabBatchList);
paymentRoutes.put("/associate-req/batch-approve", Auth, associateBillApprove);
paymentRoutes.get("/associate-req/genrate-bill", Auth, AssociateTabGenrateBill);
module.exports = { paymentRoutes }; 