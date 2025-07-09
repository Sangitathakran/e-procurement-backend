const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList,farmerListExport, getSingleFarmer, getAllStateAndDistricts,getStatewiseFarmersCount, getStatewiseFarmersCountWOAggregation, getStateWiseFarmerCount, getStateWiseProcuredQty } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/farmer-list-export",farmerListExport);
farmerManagementRoutes.get("/single-farmer/:id",getSingleFarmer);
farmerManagementRoutes.get("/farmer-address-list", getAllStateAndDistricts);
// farmerManagementRoutes.get("/farmers-count-list-statewise", getStatewiseFarmersCount);


// without aggregation
farmerManagementRoutes.get("/farmers-count-list-statewise", getStateWiseFarmerCount);
farmerManagementRoutes.get('/get-statewise-procuredQty', getStateWiseProcuredQty);


module.exports = { farmerManagementRoutes }; 
