const express = require("express");
const { procurementRoutes } = require("./procurement/Routes");
const { stockRoutes } = require("./stock/Routes");
const upagRoutes = express.Router();
upagRoutes.use("/procurment",procurementRoutes)
upagRoutes.use("/stock",stockRoutes)
module.exports = { upagRoutes };