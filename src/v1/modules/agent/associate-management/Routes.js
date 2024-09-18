

const express = require("express");
const { getAssociates } = require("./Controllers");

const associateMngmntRoutes = express.Router();


associateMngmntRoutes.get("/", getAssociates);

module.exports = { associateMngmntRoutes }; 