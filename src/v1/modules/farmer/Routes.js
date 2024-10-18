const express = require("express")
const farmerRoutes = express.Router()


const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { validateIndFarmer, validateRegisterDetail, validateFarmer, validateLand, validateCrop, validateBank } = require("./Validation")
const multer = require('multer');
const { verifyAssociate } = require("../associate/utils/verifyAssociate");
const { getSingleFarmer } = require("../head-office/farmer-management/Controller");
const { saveFarmerDetails, sendOTP, verifyOTP, registerName, getFarmerDetails, submitForm, createZip, createFarmer, bulkUploadFarmers, getFarmers, editFarmer, deletefarmer, createLand, updateLand, deleteLand, createCrop, updateCrop, deleteCrop, createBank, updateBank, deleteBank, exportFarmers, getLand, getCrop, getBank, individualfarmerList, makeAssociateFarmer, getBoFarmer, getAllFarmers } = require("./Controller");
const { verifyBO } = require("../branch-office/utils/verifyBO");
const { verifyAgent } = require("../agent/utils/verifyAgent");

farmerRoutes.post("/", verifyJwtToken, verifyAssociate, [validateFarmer, validateErrors], createFarmer);
farmerRoutes.get("/", verifyJwtToken, getFarmers);
farmerRoutes.put('/:id', verifyJwtToken, editFarmer);
farmerRoutes.delete("/", verifyJwtToken, deletefarmer);
farmerRoutes.post("/createLand", verifyJwtToken, [validateLand, validateErrors], createLand);
farmerRoutes.get("/get-land", verifyJwtToken, getLand);
farmerRoutes.put("/updateLand/:land_id", verifyJwtToken, updateLand);
farmerRoutes.delete("/deleteLand", verifyJwtToken, deleteLand);
farmerRoutes.post("/createCrop", verifyJwtToken, [validateCrop, validateErrors], createCrop);
farmerRoutes.get("/get-crop", verifyJwtToken, getCrop);
farmerRoutes.put("/updateCrop/:crop_id", verifyJwtToken, updateCrop);
farmerRoutes.delete("/deleteCrop", verifyJwtToken, deleteCrop);
farmerRoutes.post("/createBank", verifyJwtToken, [validateBank, validateErrors], createBank);
farmerRoutes.get("/get-bank", verifyJwtToken, getBank);
farmerRoutes.put("/updateBank/:bank_id", verifyJwtToken, updateBank);
farmerRoutes.delete("/deleteBank", verifyJwtToken, deleteBank);
farmerRoutes.post("/bulk-upload", verifyAssociate, bulkUploadFarmers);
farmerRoutes.post("/bulk-export", verifyJwtToken, exportFarmers);
farmerRoutes.get("/localfarmer", verifyAssociate, individualfarmerList);
farmerRoutes.post("/send-farmerOTP", sendOTP)
farmerRoutes.post("/verify-farmerOTP", verifyOTP);
farmerRoutes.post('/register-details', verifyJwtToken, [validateRegisterDetail, validateErrors], registerName)
farmerRoutes.post("/make-associate", verifyAssociate, makeAssociateFarmer);
farmerRoutes.get("/getbo-farmer", verifyBO, getBoFarmer);
farmerRoutes.get("/getall-farmer", verifyAgent, getAllFarmers);

/* 
 individual farmer routes s
             
 */
farmerRoutes.put('/onboarding-details/:id',
    // verifyJwtToken, 
    [validateFarmer, validateErrors],
    saveFarmerDetails);

farmerRoutes.get('/getFarmerDetails/:id',
    // verifyJwtToken, 
    getFarmerDetails);

farmerRoutes.post('/submit-form/:id',
    // verifyJwtToken, 
    submitForm)

farmerRoutes.get('/download-zipFile', createZip)


module.exports = { farmerRoutes } 
