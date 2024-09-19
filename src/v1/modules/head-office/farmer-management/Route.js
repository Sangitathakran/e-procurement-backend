const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList} = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);




module.exports = { farmerManagementRoutes }; 
