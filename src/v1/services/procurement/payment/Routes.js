const express = require("express");
const { payment, farmentPayment, associatePayment } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyJwtToken, payment);
paymentRoutes.get("/farmentPayment", verifyJwtToken, farmentPayment);
paymentRoutes.get("/associatePayment", verifyJwtToken, associatePayment);

module.exports = { paymentRoutes }; 