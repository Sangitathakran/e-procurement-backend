const express = require("express");
const { payment } = require("./Controller");
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const paymentRoutes = express.Router();

paymentRoutes.get("/", verifyJwtToken, payment);

module.exports = { paymentRoutes }; 