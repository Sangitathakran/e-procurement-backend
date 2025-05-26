const express = require("express");
const { getBo, updateStatus } = require("./Controllers");
const { Auth } = require("@src/v1/middlewares/jwt")

const boManagementRoutes = express.Router();

boManagementRoutes.patch("/:id/:status", Auth, updateStatus);
boManagementRoutes.get("/", Auth, getBo);



module.exports = { boManagementRoutes }; 