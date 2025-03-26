const express = require("express");
const {  batchNorthEastBulkuplod } = require("./Controllers");

const batchManagementRoutes = express.Router();

batchManagementRoutes.post("/batchNorthEastFarmer-bulkuplod", batchNorthEastBulkuplod);
module.exports = { batchManagementRoutes }; 