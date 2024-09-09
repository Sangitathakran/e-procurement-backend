const express = require("express");
const { createFarmer, bulkUploadFarmers, getFarmers } = require("./Controller");
const farmerRoutes = express.Router();
const multer = require('multer');

farmerRoutes.post("/", createFarmer);
farmerRoutes.get("/", getFarmers);
farmerRoutes.post("/bulk-upload",  bulkUploadFarmers);
module.exports = { farmerRoutes}; 