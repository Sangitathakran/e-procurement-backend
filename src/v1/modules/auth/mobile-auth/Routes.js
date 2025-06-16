const express = require("express")
const mobileAuthRoutes = express.Router()

const { loginOrRegister, sendOtp } = require("./Controller")

mobileAuthRoutes.post("/send-otp", sendOtp);
mobileAuthRoutes.post("/register-login", loginOrRegister);

module.exports = { mobileAuthRoutes }