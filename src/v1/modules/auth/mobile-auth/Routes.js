const express = require("express")
const mobileAuthRoutes = express.Router()
const {loginRequestPerMinute } = require("@src/v1/middlewares/express_app");
const { loginOrRegister, sendOtp, loginOrRegisterDistiller } = require("./Controller")

mobileAuthRoutes.post("/send-otp",loginRequestPerMinute, sendOtp);
mobileAuthRoutes.post("/register-login",loginRequestPerMinute, loginOrRegister);
mobileAuthRoutes.post("/register-login-distiller", loginRequestPerMinute,loginOrRegisterDistiller);

module.exports = { mobileAuthRoutes }