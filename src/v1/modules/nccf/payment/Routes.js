const { getOrders, batchList } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfPaymentRoutes = express.Router();

nccfPaymentRoutes.get("/", getOrders);
nccfPaymentRoutes.get("/batchList", batchList);


module.exports = { nccfPaymentRoutes }; 
