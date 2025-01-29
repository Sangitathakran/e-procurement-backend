const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList, getSingleFarmer, getAllStateAndDistricts,getStatewiseFarmersCount } = require("./Controller")

farmerManagementRoutes.get("/farmer-list", farmerList);
farmerManagementRoutes.get("/farmer-address-list", getAllStateAndDistricts);
farmerManagementRoutes.get("/farmers-count-list-statewise", getStatewiseFarmersCount);
farmerManagementRoutes.get("/single-farmer/:id", getSingleFarmer);

module.exports = { farmerManagementRoutes }; 
