const express = require("express");
const { getAssociates, updateOrInsertUsers, addFarmers, addProcurementCenter, updateOrInsertUsersTesting, associateFarmerList,
    createOfferOrder, getProcurementCenter, getProcurementCenterTesting, getMandiName, getAllMandiName, totalQty } = require("./Controllers");

const associateMngmntRoutes = express.Router();

associateMngmntRoutes.get("/", getAssociates);
associateMngmntRoutes.get("/updateOrInsertUsers", updateOrInsertUsers);
associateMngmntRoutes.get("/updateOrInsertUsersTesting", updateOrInsertUsersTesting);
associateMngmntRoutes.get("/addFarmers", addFarmers);
associateMngmntRoutes.get("/addProcurementCenter", addProcurementCenter);
associateMngmntRoutes.get("/getProcurementCenter", getProcurementCenter);
associateMngmntRoutes.get("/getProcurementCenterTesting", getProcurementCenterTesting);
associateMngmntRoutes.get("/associateFarmerList", associateFarmerList);
associateMngmntRoutes.post("/createOfferOrder", createOfferOrder);

associateMngmntRoutes.get("/getMandiName", getMandiName);
associateMngmntRoutes.get("/getAllMandiName", getAllMandiName);

associateMngmntRoutes.get("/totalQty", totalQty);

module.exports = { associateMngmntRoutes }; 