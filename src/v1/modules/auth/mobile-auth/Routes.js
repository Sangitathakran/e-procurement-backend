const express = require("express")
const mobileAuthRoutes = express.Router()

const { login } = require("./Controller")

mobileAuthRoutes.post('/login', login )

module.exports = { mobileAuthRoutes }