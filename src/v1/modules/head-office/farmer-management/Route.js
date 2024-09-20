const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList, getSingleFarmer } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/single-farmer/:id/:associate",getSingleFarmer);




module.exports = { farmerManagementRoutes }; 
