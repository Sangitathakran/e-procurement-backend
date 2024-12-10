const express = require("express");
const { payment, associateOrders, batchList, batchApprove, qcReport, paymentApprove, getBill, lot_list, agentPaymentList, agentBill, boBillRejection } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")