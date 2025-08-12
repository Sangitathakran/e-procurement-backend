const express = require("express");
const {
  getAssignedScheme,
  getslaByBo,
} = require("./Controller");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index");

const assignSchemeRoutes = express.Router();

assignSchemeRoutes.get("/",authenticateUser,authorizeRoles(_userType.bo), Auth, getAssignedScheme);
assignSchemeRoutes.get("/getSlaByBo",authenticateUser,authorizeRoles(_userType.bo), Auth, getslaByBo);

module.exports = { assignSchemeRoutes };
