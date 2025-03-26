const express = require("express");
const { getAssociates, associateNorthEastBulkuplod, updateOrInsertUsers } = require("./Controllers");

const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", getAssociates);
associateMngmntRoutes.post("/associateNorthEastFarmer-bulkuplod", associateNorthEastBulkuplod);
associateMngmntRoutes.get("/updateOrInsertUsers", updateOrInsertUsers);


module.exports = { associateMngmntRoutes }; 