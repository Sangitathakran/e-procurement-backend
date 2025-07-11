const express = require("express")
const emailAuthRoutes = express.Router()
const {RequestPerMinute } = require("@src/v1/middlewares/express_app");
const { login, resetPassword, forgetPassword ,logout ,checkSecretKey} = require("./Controller")

emailAuthRoutes.post('/login', login)
emailAuthRoutes.post('/forgetPassword',RequestPerMinute, forgetPassword)
emailAuthRoutes.post('/resetPassword', resetPassword)
emailAuthRoutes.post('/logout', logout)
emailAuthRoutes.get('/session_verfiy', checkSecretKey)
module.exports = { emailAuthRoutes }