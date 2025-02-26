const express = require("express");
const {
  getAssignedScheme,
  getslaByBo,
} = require("./Controller");

const { Auth } = require("@src/v1/middlewares/jwt");

const assignSchemeRoutes = express.Router();

assignSchemeRoutes.get("/", Auth, getAssignedScheme);
assignSchemeRoutes.get("/getSlaByBo", Auth, getslaByBo);

module.exports = { assignSchemeRoutes };
