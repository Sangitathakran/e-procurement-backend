

const express = require("express");
const { getRequirements, getBatchByReq, uploadRecevingStatus, getBatch } = require("./Controller");
const { verifyBO } = require("../utils/verifyBO");

const requirementRoutes = express.Router();


requirementRoutes.get("/", verifyBO, getRequirements);
requirementRoutes.get("/batch", verifyBO, getBatchByReq);
requirementRoutes.put("/batch", verifyBO, uploadRecevingStatus);
requirementRoutes.get("/batch/:id", verifyBO, getBatch);

module.exports = { requirementRoutes }; 