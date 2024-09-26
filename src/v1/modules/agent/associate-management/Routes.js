

const express = require("express");
const { getAssociates, userStatusUpdate, statusUpdate, pendingRequests, getAssociatesById } = require("./Controllers");
const { verifyAgent } = require("../utils/verifyAgent");

const associateMngmntRoutes = express.Router();


associateMngmntRoutes.get("/", verifyAgent, getAssociates);
associateMngmntRoutes.patch("/update-approval", userStatusUpdate);
associateMngmntRoutes.patch("/status", statusUpdate);
associateMngmntRoutes.get("/pending", pendingRequests);
associateMngmntRoutes.get("/details/:id", getAssociatesById);


module.exports = { associateMngmntRoutes }; 