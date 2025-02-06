const express = require("express");
const { createAgentScheme } = require("./Controller");
const schemeRoute = express.Router();
schemeRoute.post("/", createAgentScheme);
// schemeRoute.get("/create-scheme", createAgentScheme);
module.exports = { schemeRoute };