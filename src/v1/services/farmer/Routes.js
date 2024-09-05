const express = require("express");
const { createFarmer, bulkUploadFarmers } = require("./Controller");
const farmerRoutes = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'src/v1/uploads/' });

farmerRoutes.post("/", createFarmer);
farmerRoutes.post("/bulk-upload",  bulkUploadFarmers);
module.exports = { farmerRoutes}; 