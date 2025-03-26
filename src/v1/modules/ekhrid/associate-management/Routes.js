const express = require("express");
const { getAssociates, associateNorthEastBulkuplod } = require("./Controllers");

const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", Auth, getAssociates);

associateMngmntRoutes.post("/associateNorthEastFarmer-bulkuplod", associateNorthEastBulkuplod);
module.exports = { associateMngmntRoutes }; 