const express = require("express");
const { getAssociates, updateOrInsertUsers, associateFarmerList,createOfferOrder } = require("./Controllers");

const associateMngmntRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt")

associateMngmntRoutes.get("/", getAssociates);
associateMngmntRoutes.get("/updateOrInsertUsers", updateOrInsertUsers);
associateMngmntRoutes.get("/associateFarmerList", associateFarmerList);
associateMngmntRoutes.get("/createOfferOrder", createOfferOrder);
module.exports = { associateMngmntRoutes }; 