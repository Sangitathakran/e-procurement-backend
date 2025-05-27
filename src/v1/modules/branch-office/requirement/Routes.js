

const express = require("express");
const { getRequirements, getBatchByReq, uploadRecevingStatus, getBatch, getFarmerByBatchId, auditTrail } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const requirementRoutes = express.Router();


requirementRoutes.get("/", Auth, getRequirements);
requirementRoutes.get("/batch", Auth, getBatchByReq);
requirementRoutes.put("/batch", Auth, uploadRecevingStatus);
requirementRoutes.get("/batch/:id", Auth, getBatch);
requirementRoutes.get("/farmer/:id", Auth, getFarmerByBatchId);
requirementRoutes.get("/audit-trial", Auth, auditTrail);


module.exports = { requirementRoutes }; 