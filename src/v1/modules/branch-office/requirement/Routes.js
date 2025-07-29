

const express = require("express");
const { getRequirements, getBatchByReq, uploadRecevingStatus, getBatch, getFarmerByBatchId, auditTrail } = require("./Controller");
const { _userType } = require("@src/v1/utils/constants/index");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")


const requirementRoutes = express.Router();


requirementRoutes.get("/",authenticateUser,authorizeRoles(_userType.bo), Auth, getRequirements);
requirementRoutes.get("/batch",authenticateUser,authorizeRoles(_userType.bo), Auth, getBatchByReq);
requirementRoutes.put("/batch",authenticateUser,authorizeRoles(_userType.bo), Auth, uploadRecevingStatus);
requirementRoutes.get("/batch/:id",authenticateUser,authorizeRoles(_userType.bo), Auth, getBatch);
requirementRoutes.get("/farmer/:id",authenticateUser,authorizeRoles(_userType.bo),authenticateUser,authorizeRoles(_userType.bo), Auth, getFarmerByBatchId);
requirementRoutes.get("/audit-trial",authenticateUser,authorizeRoles(_userType.bo), Auth, auditTrail);


module.exports = { requirementRoutes }; 