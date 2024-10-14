const express = require("express")
const emailAuthRoutes = express.Router()

const { login } = require("./Controller")

emailAuthRoutes.post('/login', login )

module.exports = { emailAuthRoutes }