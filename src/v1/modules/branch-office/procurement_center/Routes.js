const { _middleware } = require("@src/v1/utils/constants/messages");
const { getProcurementCenter } = require("./Controller");
const express = require("express");
const procurementCenterRoutes = express.Router();
const { _userType } = require("@src/v1/utils/constants/index")
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")

procurementCenterRoutes.get("/",authenticateUser,authorizeRoles(_userType.bo), Auth, getProcurementCenter);

module.exports = { procurementCenterRoutes }; 
