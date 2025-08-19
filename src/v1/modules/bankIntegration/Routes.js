const express = require("express");
const { sendRequest, paymentStatus, decryptEncryption } = require("./Controller");
// const { postReq } = require("./ccAvenueToolkit/ccavRequestHandler");
const {commonAuth} = require("@middlewares/jwt")

const bankIntegrationRoutes = express.Router();

bankIntegrationRoutes.post("/send-request",commonAuth, sendRequest);
bankIntegrationRoutes.post("/payment-status", paymentStatus);
bankIntegrationRoutes.post("/check-decryption",commonAuth, decryptEncryption);

module.exports = { bankIntegrationRoutes };
