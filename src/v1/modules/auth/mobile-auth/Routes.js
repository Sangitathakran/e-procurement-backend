const express = require("express")
const mobileAuthRoutes = express.Router()

const { loginOrRegister, sendOtp, loginOrRegisterDistiller } = require("./Controller")

mobileAuthRoutes.post("/send-otp", sendOtp);
mobileAuthRoutes.post("/register-login", loginOrRegister);
mobileAuthRoutes.post("/register-login-distiller", loginOrRegisterDistiller);

module.exports = { mobileAuthRoutes }