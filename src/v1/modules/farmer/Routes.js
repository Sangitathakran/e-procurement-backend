const express = require("express")
const farmerRoutes = express.Router()
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { validateIndFarmer, validateRegisterDetail, validateFarmer, validateLand, validateCrop, validateBank } = require("./Validation")
const { verifyAssociate } = require("../associate/utils/verifyAssociate");
const { apiKeyAuth } = require("../warehouse/utils/verifyWarehouseOwner");
const { saveFarmerDetails,updateIndCrop,getLandDetails, getIndCropDetails,sendOTP, verifyOTP, registerName, getFarmerDetails, submitForm, createZip, createFarmer, bulkUploadFarmers, getFarmers, deletefarmer, createLand, updateLand, deleteLand, createCrop, updateCrop, deleteCrop, createBank, updateBank, deleteBank, exportFarmers, getLand, getCrop, getBank, individualfarmerList, makeAssociateFarmer, getBoFarmer, getAllFarmers, getstatedistrictname, getBoFarmerPreview, uploadFarmerDocument, getFarmerDocument,getLocationOfIpaddress, editFarmerDocument, getStates, getDistrictByState,addDistrictCity,  } = require("./Controller");
const { verifyBO } = require("../branch-office/utils/verifyBO");
// const { verifyAgent } = require("../agent/utils/verifyAgent");
const { Auth } = require("@src/v1/middlewares/jwt");
const { farmerList } = require("../head-office/farmer-management/Controller");

farmerRoutes.post("/", verifyJwtToken, verifyAssociate, [validateFarmer, validateErrors], createFarmer);
farmerRoutes.get("/", verifyJwtToken, getFarmers);
// farmerRoutes.put('/:id', verifyJwtToken, editFarmer);
farmerRoutes.delete("/", verifyJwtToken, deletefarmer);
farmerRoutes.post("/createLand", verifyJwtToken,
    //   [validateLand, validateErrors],
      createLand);
farmerRoutes.get("/get-land", verifyJwtToken, getLand);
farmerRoutes.get("/get-land-details/:id", 
    verifyJwtToken, getLandDetails);
farmerRoutes.put("/updateLand/:land_id", verifyJwtToken, updateLand);
farmerRoutes.put("/updateIndCrop/:farmer_id", verifyJwtToken, updateIndCrop);
farmerRoutes.delete("/deleteLand", verifyJwtToken, deleteLand);
farmerRoutes.post("/createCrop", verifyJwtToken, [validateCrop, validateErrors], createCrop);
farmerRoutes.post("/createIndCrop", verifyJwtToken, createCrop);
farmerRoutes.get("/get-crop", verifyJwtToken, getCrop);
farmerRoutes.get("/get-crop-details", verifyJwtToken, getIndCropDetails);
farmerRoutes.put("/updateCrop/:crop_id", verifyJwtToken, updateCrop);
farmerRoutes.delete("/deleteCrop", verifyJwtToken, deleteCrop);
farmerRoutes.post("/createBank", verifyJwtToken, [validateBank, validateErrors], createBank);
farmerRoutes.get("/get-bank", verifyJwtToken, getBank);
farmerRoutes.put("/updateBank/:bank_id", verifyJwtToken, updateBank);
farmerRoutes.delete("/deleteBank", verifyJwtToken, deleteBank);
farmerRoutes.post("/bulk-upload", verifyAssociate, bulkUploadFarmers);
farmerRoutes.put("/edit-farmer-document", verifyAssociate, editFarmerDocument);
farmerRoutes.post("/bulk-export", verifyJwtToken, exportFarmers);
farmerRoutes.get("/localfarmer", verifyAssociate, individualfarmerList);
farmerRoutes.post("/send-farmerOTP", sendOTP)
farmerRoutes.post("/verify-farmerOTP", verifyOTP);
farmerRoutes.post('/register-details', verifyJwtToken, [validateRegisterDetail, validateErrors], registerName)
farmerRoutes.post("/make-associate", verifyAssociate, makeAssociateFarmer);
farmerRoutes.get("/getbo-farmer", Auth, getBoFarmer);
farmerRoutes.get("/getall-farmer", Auth, getAllFarmers);
farmerRoutes.get("/bo-preview/:id", Auth, getBoFarmerPreview);
farmerRoutes.post("/add-district", addDistrictCity);
// farmerRoutes.post("/bulk-upload-northEastFarmer", verifyAssociate, bulkUploadNorthEastFarmers);

farmerRoutes.put("/upload-farmer-document", Auth, uploadFarmerDocument);
farmerRoutes.get("/farmer-document", Auth, getFarmerDocument);
farmerRoutes.get("/get-states", Auth, getStates);
farmerRoutes.get("/get-district-by-state/:id", Auth, getDistrictByState);

/* 
 individual farmer routes 
 */
farmerRoutes.post("/send-farmerOTP", sendOTP);
farmerRoutes.post("/verify-farmerOTP", verifyOTP);
farmerRoutes.post('/register-details', verifyJwtToken, [validateRegisterDetail, validateErrors], registerName)
farmerRoutes.put('/onboarding-details/:id',
    verifyJwtToken, 
    [validateIndFarmer, validateErrors],
    saveFarmerDetails);

farmerRoutes.get('/getFarmerDetails/:id',
    verifyJwtToken,
    getFarmerDetails);

farmerRoutes.put('/submit-form/:id',
    verifyJwtToken,
    submitForm)

farmerRoutes.get('/download-zipFile', createZip)

farmerRoutes.post('/get-state-from-ip-address',getLocationOfIpaddress)
/* 
 individual farmer haryana bulkuplod
 */
//  farmerRoutes.post("/haryana-farmer-uplod", apiKeyAuth, haryanaFarmerUplod);
module.exports = { farmerRoutes } 
