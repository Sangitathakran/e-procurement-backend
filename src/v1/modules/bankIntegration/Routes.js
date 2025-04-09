const express = require("express");
const { sendRequest, paymentStatus, decryptEncryption } = require("./Controller");
// const { postReq } = require("./ccAvenueToolkit/ccavRequestHandler");

const bankIntegrationRoutes = express.Router();

bankIntegrationRoutes.post("/send-request", sendRequest);
bankIntegrationRoutes.post("/payment-status", paymentStatus);
bankIntegrationRoutes.post("/check-decryption", decryptEncryption);

module.exports = { bankIntegrationRoutes };
