const express = require("express")
const emailAuthRoutes = express.Router()

const { login, resetPassword, forgetPassword } = require("./Controller")

emailAuthRoutes.post('/login', login)
emailAuthRoutes.post('/forgetPassword', forgetPassword)
emailAuthRoutes.post('/resetPassword', resetPassword)


module.exports = { emailAuthRoutes }