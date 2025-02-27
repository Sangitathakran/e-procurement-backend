const express = require("express");
const {
  getScheme,
  getAssignedScheme,
  updateScheme,
  deleteScheme,
  getslaByBo,
} = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const schemeRoutes = express.Router();
schemeRoutes.get("/", Auth, getScheme);
schemeRoutes.get("/getAssignedScheme", Auth, getAssignedScheme);
schemeRoutes.get("/getSlaByBo",Auth, getslaByBo);
schemeRoutes.put("/", Auth, updateScheme);
schemeRoutes.delete("/:id", Auth, deleteScheme);

module.exports = { schemeRoutes };
