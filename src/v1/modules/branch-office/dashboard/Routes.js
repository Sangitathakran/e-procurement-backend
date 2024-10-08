const { _middleware } = require("@src/v1/utils/constants/messages");
const { getProcurementCenter } = require("./Controller");
const express = require("express");
const { verifyBO } = require("../utils/verifyBO");
const procurementCenterRoutes = express.Router();


procurementCenterRoutes.get("/", verifyBO, getProcurementCenter);

module.exports = { procurementCenterRoutes }; 
