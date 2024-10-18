const express = require("express")
const authRoutes = express.Router()

const { emailAuthRoutes } = require("./email-auth/Routes")
const { mobileAuthRoutes } = require("./mobile-auth/Routes")

authRoutes.use("/email", emailAuthRoutes)
authRoutes.use("/mobile", mobileAuthRoutes)


module.exports = { authRoutes } 