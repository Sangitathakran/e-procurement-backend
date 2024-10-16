const express = require("express");
const { getBo, updateStatus } = require("./Controllers");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt")

const boManagementRoutes = express.Router();

boManagementRoutes.patch("/:id/:status", verifyJwtToken, updateStatus);
boManagementRoutes.get("/", verifyJwtToken, getBo);



module.exports = { boManagementRoutes }; 