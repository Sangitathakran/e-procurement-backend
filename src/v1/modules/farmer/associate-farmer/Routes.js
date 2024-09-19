const express = require("express");
const { createFarmer, bulkUploadFarmers, getFarmers, editFarmer, deletefarmer, createLand, updateLand, deleteLand, createCrop, updateCrop, deleteCrop, createBank, updateBank, deleteBank, exportFarmers, getLand, getCrop, getBank} = require("./Controller");
const associateFarmerRoutes = express.Router();
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { validateFarmer, validateLand, validateCrop, validateBank } = require("./Validation")
const multer = require('multer');

associateFarmerRoutes.post("/", verifyJwtToken,[validateFarmer,validateErrors], createFarmer);
associateFarmerRoutes.get("/", verifyJwtToken, getFarmers);
associateFarmerRoutes.put('/:id', verifyJwtToken, editFarmer);
associateFarmerRoutes.delete("/", verifyJwtToken, deletefarmer);
associateFarmerRoutes.post("/createLand", verifyJwtToken, [validateLand,validateErrors], createLand);
associateFarmerRoutes.get("/get-land", verifyJwtToken, getLand);
associateFarmerRoutes.put("/updateLand/:land_id", verifyJwtToken,  updateLand);
associateFarmerRoutes.delete("/deleteLand", verifyJwtToken,  deleteLand);
associateFarmerRoutes.post("/createCrop", verifyJwtToken, [validateCrop,validateErrors],  createCrop);
associateFarmerRoutes.get("/get-crop", verifyJwtToken, getCrop);
associateFarmerRoutes.put("/updateCrop/:crop_id", verifyJwtToken,  updateCrop);
associateFarmerRoutes.delete("/deleteCrop", verifyJwtToken, deleteCrop);
associateFarmerRoutes.post("/createBank", verifyJwtToken, [validateBank,validateErrors], createBank);
associateFarmerRoutes.get("/get-bank", verifyJwtToken, getBank);
associateFarmerRoutes.put("/updateBank/:bank_id", verifyJwtToken,  updateBank);
associateFarmerRoutes.delete("/deleteBank", verifyJwtToken, deleteBank);
associateFarmerRoutes.post("/bulk-upload", verifyJwtToken,  bulkUploadFarmers);
associateFarmerRoutes.post("/bulk-export", verifyJwtToken,  exportFarmers);
module.exports = { associateFarmerRoutes}; 