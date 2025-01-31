const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList, getSingleFarmer, getAllStateAndDistricts } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/single-farmer/:id",getSingleFarmer);
farmerManagementRoutes.get("/farmer-address-list", getAllStateAndDistricts);



module.exports = { farmerManagementRoutes }; 
