const express = require("express");
const { createScheme, getScheme, getSchemeById, updateScheme, deleteScheme, statusUpdateScheme, schemeSummary, getSchemeSummary } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const schemeRoutes = express.Router();

schemeRoutes.get("/schemeSummary", Auth, schemeSummary);
schemeRoutes.get("/getSchemeSummary", Auth, getSchemeSummary);

schemeRoutes.post("/", Auth, createScheme);
schemeRoutes.get("/", Auth, getScheme);
schemeRoutes.get("/:id", Auth, getSchemeById);
schemeRoutes.put("/", Auth, updateScheme);
schemeRoutes.delete("/:id", Auth, deleteScheme);
schemeRoutes.patch("/", Auth, statusUpdateScheme);



module.exports = { schemeRoutes };