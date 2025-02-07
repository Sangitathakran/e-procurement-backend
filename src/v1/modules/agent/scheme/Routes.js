const express = require("express");
const { createScheme, getScheme, getSchemeById, updateScheme, deleteScheme, statusUpdateScheme } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt");

const schemeRoute = express.Router();

schemeRoute.post("/", Auth, createScheme);
schemeRoute.get("/", Auth, getScheme);
schemeRoute.get("/:id", Auth, getSchemeById);
schemeRoute.post("/", Auth, createCommodity);
schemeRoute.put("/", Auth, updateScheme);
schemeRoute.delete("/:id", Auth, deleteScheme);
schemeRoute.patch("/", Auth, statusUpdateScheme);

module.exports = { schemeRoute };