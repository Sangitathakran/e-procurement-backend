const { getOrders, batchList } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfPaymentRoutes = express.Router();
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

nccfPaymentRoutes.get("/",authenticateUser,authorizeRoles(_userType.nccf), Auth, getOrders);
nccfPaymentRoutes.get("/batchList",authenticateUser,authorizeRoles(_userType.nccf), Auth, batchList);


module.exports = { nccfPaymentRoutes }; 
