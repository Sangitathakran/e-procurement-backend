

const express = require("express");
const { getHo } = require("./Controllers");

const hoMngmntRoutes = express.Router();


hoMngmntRoutes.get("/", getHo);

module.exports = { hoMngmntRoutes }; 