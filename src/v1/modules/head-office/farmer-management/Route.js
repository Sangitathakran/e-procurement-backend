const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList, getSingleFarmer } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/single-farmer/:id/:type",getSingleFarmer);




module.exports = { farmerManagementRoutes }; 
