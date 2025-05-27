const express = require("express");
const { procurementRoutes } = require("./procurement/Routes");
const { stockRoutes } = require("./stock/Routes");
const { authRouters } = require("./auth/Routes");
const upagRoutes = express.Router();
upagRoutes.use("/procurment",procurementRoutes)
upagRoutes.use("/stock",stockRoutes)
upagRoutes.use("/auth",authRouters)

module.exports = { upagRoutes };