const express = require("express")
const authRoutes = express.Router()

const { emailAuthRoutes } = require("./email-auth/Routes")

authRoutes.use("/email", emailAuthRoutes)


module.exports = { authRoutes } 