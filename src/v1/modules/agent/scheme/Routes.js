const express = require("express");
const { createScheme, getScheme, getSchemeById, updateScheme, deleteScheme, statusUpdateScheme, schemeSummary, getBoByScheme, getslaByBo, schemeDropdown } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");
const { commodityRoutes } = require("../commodity/Routes");

const schemeRoutes = express.Router();

schemeRoutes.get("/schemeDropdown", Auth, schemeDropdown);

schemeRoutes.get("/schemeSummary", Auth, schemeSummary);
schemeRoutes.get("/getBoByScheme", Auth, getBoByScheme);
schemeRoutes.get("/getslaByBo", Auth, getslaByBo);

schemeRoutes.post("/", Auth, createScheme);
schemeRoutes.get("/", Auth, getScheme);
schemeRoutes.get("/:id", Auth, getSchemeById);
schemeRoutes.put("/", Auth, updateScheme);
schemeRoutes.delete("/:id", Auth, deleteScheme);
schemeRoutes.patch("/", Auth, statusUpdateScheme);



module.exports = { schemeRoutes };