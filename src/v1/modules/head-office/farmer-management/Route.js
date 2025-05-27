const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList, getSingleFarmer, getAllStateAndDistricts,getStatewiseFarmersCount } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/single-farmer/:id",getSingleFarmer);
farmerManagementRoutes.get("/farmer-address-list", getAllStateAndDistricts);
farmerManagementRoutes.get("/farmers-count-list-statewise", getStatewiseFarmersCount);



module.exports = { farmerManagementRoutes }; 
