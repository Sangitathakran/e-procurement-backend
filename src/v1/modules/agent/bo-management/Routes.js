const express = require("express");
const { getBo, updateStatus } = require("./Controllers");
const { verifyAgent } = require("../utils/verifyAgent");

const boManagementRoutes = express.Router();

boManagementRoutes.patch("/:id/:status", verifyAgent, updateStatus);
boManagementRoutes.get("/", verifyAgent, getBo);



module.exports = { boManagementRoutes }; 