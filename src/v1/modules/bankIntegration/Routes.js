const express = require("express");
const { sendRequest, paymentStatus } = require("./Controller");
// const { postReq } = require("./ccAvenueToolkit/ccavRequestHandler");

const bankIntegrationRoutes = express.Router();

bankIntegrationRoutes.post("/send-request", sendRequest);
bankIntegrationRoutes.post("/payment-status", paymentStatus);

module.exports = { bankIntegrationRoutes };
