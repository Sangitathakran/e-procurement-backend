const express = require("express");
const farmerManagementRoutes = express.Router();

const {farmerList,farmerListExport, getSingleFarmer, getAllStateAndDistricts,getStatewiseFarmersCount, getStatewiseFarmersCountWOAggregation, getStateWiseProcuredQty, getStateWiseFarmerCount } = require("./Controller")

farmerManagementRoutes.get("/farmer-list",farmerList);
farmerManagementRoutes.get("/farmer-list-export",farmerListExport);
farmerManagementRoutes.get("/single-farmer/:id",getSingleFarmer);
farmerManagementRoutes.get("/farmer-address-list", getAllStateAndDistricts);
// farmerManagementRoutes.get("/farmers-count-list-statewise", getStatewiseFarmersCount);
farmerManagementRoutes.get('/get-statewise-procuredQty', getStateWiseProcuredQty);

// without aggregation
farmerManagementRoutes.get("/farmers-count-list-statewise", getStateWiseFarmerCount);
farmerManagementRoutes.get('/get-statewise-procuredQty', getStateWiseProcuredQty);


module.exports = { farmerManagementRoutes }; 
