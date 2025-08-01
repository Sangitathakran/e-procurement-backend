

const express = require("express");
const { getAssociates, userStatusUpdate, statusUpdate, pendingRequests, getAssociatesById, bulkuplodAssociate, associateNorthEastBulkuplod } = require("./Controllers");


const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", Auth, getAssociates);
associateMngmntRoutes.patch("/update-approval",Auth, userStatusUpdate);
associateMngmntRoutes.patch("/status",Auth, statusUpdate);
associateMngmntRoutes.get("/pending",Auth, pendingRequests);
associateMngmntRoutes.get("/details/:id",Auth, getAssociatesById);

associateMngmntRoutes.post("/associate-bulkuplod", Auth, bulkuplodAssociate);
associateMngmntRoutes.post("/associateNorthEastFarmer-bulkuplod",Auth, associateNorthEastBulkuplod);
module.exports = { associateMngmntRoutes }; 