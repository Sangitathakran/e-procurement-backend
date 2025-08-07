const express = require("express")
const emailAuthRoutes = express.Router()
const {RequestPerMinute,loginRequestPerMinute } = require("@src/v1/middlewares/express_app");
const { login, resetPassword, forgetPassword ,logout ,checkSecretKey} = require("./Controller")

// emailAuthRoutes.post('/login',login)
emailAuthRoutes.post('/login', loginRequestPerMinute,login)
emailAuthRoutes.post('/forgetPassword',RequestPerMinute, forgetPassword)
emailAuthRoutes.post('/resetPassword',RequestPerMinute, resetPassword)
emailAuthRoutes.post('/logout', logout)
emailAuthRoutes.get('/session_verfiy', checkSecretKey)
module.exports = { emailAuthRoutes }