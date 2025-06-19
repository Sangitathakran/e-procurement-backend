const express = require("express");
const { getProcurementData, postProcurementData } = require("./Controllers");
const { authMiddleware } = require("../auth/Controllers");
const { validateProcurement } = require("@src/v1/middlewares/upag_validations");
const procurementRoutes = express.Router()

procurementRoutes.get("/get-procurement",authMiddleware,getProcurementData)
procurementRoutes.post('/submit-procurement', postProcurementData);
module.exports = { procurementRoutes };

