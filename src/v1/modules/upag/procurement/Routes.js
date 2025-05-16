const express = require("express");
const { getProcurementData } = require("./Controllers");
const procurementRoutes = express.Router()

procurementRoutes.get("/get-procurement",getProcurementData)
module.exports = { procurementRoutes };

