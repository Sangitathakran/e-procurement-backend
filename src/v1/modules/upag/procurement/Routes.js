const express = require("express");
const { getProcurementData } = require("./Controllers");
const { authMiddleware } = require("../auth/Controllers");
const procurementRoutes = express.Router()

procurementRoutes.get("/get-procurement",authMiddleware,getProcurementData)
module.exports = { procurementRoutes };

