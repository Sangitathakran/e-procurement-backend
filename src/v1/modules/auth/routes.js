const express = require("express")
const authRoutes = express.Router()

const { emailAuthRoutes } = require("./email-auth/Routes")
const { mobileAuthRoutes } = require("./mobile-auth/Routes")
const { aadharAuthRoutes } = require("./aadhar-auth/Routes");
const { bankAuthRoutes } = require("./bank_verify/Routes");
const { onGridMiddleware } = require("@src/v1/middlewares/on-grid");

authRoutes.use("/email", emailAuthRoutes)
authRoutes.use("/mobile", mobileAuthRoutes)
authRoutes.use("/aadhar", onGridMiddleware, aadharAuthRoutes);
authRoutes.use('/bank', onGridMiddleware, bankAuthRoutes );


module.exports = { authRoutes } 