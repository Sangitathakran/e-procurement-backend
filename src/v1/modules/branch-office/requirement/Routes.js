

const express = require("express");
const { getRequirements, getBatchByReq } = require("./Controller");

const requirementRoutes = express.Router();


requirementRoutes.get("/", getRequirements);
requirementRoutes.get("/batch", getBatchByReq);

module.exports = { requirementRoutes }; 