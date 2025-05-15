const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList, getSingleFarmer, getAllStateAndDistricts,getStatewiseFarmersCount, getStatewiseFarmersCountWOAggregation } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/single-farmer/:id",getSingleFarmer);
farmerManagementRoutes.get("/farmer-address-list", getAllStateAndDistricts);
// farmerManagementRoutes.get("/farmers-count-list-statewise", getStatewiseFarmersCount);


// without aggregation
farmerManagementRoutes.get("/farmers-count-list-statewise", getStatewiseFarmersCountWOAggregation);


module.exports = { farmerManagementRoutes }; 
