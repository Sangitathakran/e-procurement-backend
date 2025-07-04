const express = require("express")
const emailAuthRoutes = express.Router()

const { login, resetPassword, forgetPassword ,logout } = require("./Controller")

emailAuthRoutes.post('/login', login)
emailAuthRoutes.post('/forgetPassword', forgetPassword)
emailAuthRoutes.post('/resetPassword', resetPassword)
emailAuthRoutes.post('/logout', logout)
module.exports = { emailAuthRoutes }