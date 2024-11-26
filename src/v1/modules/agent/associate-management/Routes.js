

const express = require("express");
const { getAssociates, userStatusUpdate, statusUpdate, pendingRequests, getAssociatesById } = require("./Controllers");


const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", Auth, getAssociates);
associateMngmntRoutes.patch("/update-approval", userStatusUpdate);
associateMngmntRoutes.patch("/status", statusUpdate);
associateMngmntRoutes.get("/pending", pendingRequests);
associateMngmntRoutes.get("/details/:id", getAssociatesById);


module.exports = { associateMngmntRoutes }; 