const express = require("express");
const { getAssociates, updateOrInsertUsers, addFarmers, addProcurementCenter, associateFarmerList, createOfferOrder } = require("./Controllers");

const associateMngmntRoutes = express.Router();

associateMngmntRoutes.get("/", getAssociates);
associateMngmntRoutes.get("/updateOrInsertUsers", updateOrInsertUsers);
associateMngmntRoutes.get("/addFarmers", addFarmers);
associateMngmntRoutes.get("/addProcurementCenter", addProcurementCenter);
associateMngmntRoutes.get("/associateFarmerList", associateFarmerList);
associateMngmntRoutes.post("/createOfferOrder", createOfferOrder);
module.exports = { associateMngmntRoutes }; 