
const express = require("express");
const { userAuthRoutes } = require("./auth/Routes");
const { paymentRoutes } = require("./payment/Routes");
const branchOfficeoRoutes = express.Router();



branchOfficeoRoutes.use("/auth", userAuthRoutes);
branchOfficeoRoutes.use("/payment", paymentRoutes);


module.exports = { branchOfficeoRoutes };