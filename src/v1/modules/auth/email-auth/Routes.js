const express = require("express")
const emailAuthRoutes = express.Router()

const { login, resetPassword, forgetPassword ,logout ,checkSecretKey} = require("./Controller")

emailAuthRoutes.post('/login', login)
emailAuthRoutes.post('/forgetPassword', forgetPassword)
emailAuthRoutes.post('/resetPassword', resetPassword)
emailAuthRoutes.post('/logout', logout)
emailAuthRoutes.get('/:secretKey', checkSecretKey)
module.exports = { emailAuthRoutes }