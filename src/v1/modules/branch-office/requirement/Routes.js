

const express = require("express");
const { getRequirements, getBatchByReq, uploadRecevingStatus, getBatch, getFarmerByBatchId } = require("./Controller");
const { verifyBO } = require("../utils/verifyBO");

const requirementRoutes = express.Router();


requirementRoutes.get("/", verifyBO, getRequirements);
requirementRoutes.get("/batch", verifyBO, getBatchByReq);
requirementRoutes.put("/batch", verifyBO, uploadRecevingStatus);
requirementRoutes.get("/batch/:id", verifyBO, getBatch);
requirementRoutes.get("/farmer/:id", verifyBO, getFarmerByBatchId);
// requirementRoutes.get("/audit-trial" ,)


module.exports = { requirementRoutes }; 