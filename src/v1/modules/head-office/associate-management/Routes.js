

const express = require("express");
const { getAssociates } = require("./Controller");


const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", Auth, getAssociates);

module.exports = { associateMngmntRoutes }; 