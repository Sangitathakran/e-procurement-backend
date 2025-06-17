const express = require("express")
const authRoutes = express.Router()

const { emailAuthRoutes } = require("./email-auth/Routes")
const { mobileAuthRoutes } = require("./mobile-auth/Routes")
const { aadharAuthRoutes } = require("./aadhar-auth/Routes");
const { bankAuthRoutes } = require("./bank_verify/Routes");

authRoutes.use("/email", emailAuthRoutes)
authRoutes.use("/mobile", mobileAuthRoutes)
authRoutes.use("/aadhar", aadharAuthRoutes)
authRoutes.use('/bank', bankAuthRoutes );


module.exports = { authRoutes } 