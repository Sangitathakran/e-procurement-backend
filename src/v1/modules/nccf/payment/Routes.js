const { getOrders, batchList } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfPaymentRoutes = express.Router();

nccfPaymentRoutes.get("/", Auth, getOrders);
nccfPaymentRoutes.get("/batchList", Auth, batchList);


module.exports = { nccfPaymentRoutes }; 
