const { _middleware } = require("@src/v1/utils/constants/messages");
const { getProcurementCenter } = require("./Controller");
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt")
const procurementCenterRoutes = express.Router();


procurementCenterRoutes.get("/", Auth, getProcurementCenter);

module.exports = { procurementCenterRoutes }; 
