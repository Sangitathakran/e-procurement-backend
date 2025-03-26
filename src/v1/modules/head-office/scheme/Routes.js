const express = require("express");
const { getScheme, getAssignedScheme, updateScheme, deleteScheme } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const schemeRoutes = express.Router();

schemeRoutes.get("/", Auth, getScheme);
schemeRoutes.get("/getAssignedScheme", Auth, getAssignedScheme);
schemeRoutes.put("/", Auth, updateScheme);
schemeRoutes.delete("/:id", Auth, deleteScheme);

module.exports = { schemeRoutes };