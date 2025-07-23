const express = require("express")
const farmerRoutes = express.Router()
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { validateIndFarmer, validateRegisterDetail, validateFarmer, validateLand, validateCrop, validateBank } = require("./Validation")
const { verifyAssociate } = require("../associate/utils/verifyAssociate");
const { apiKeyAuth } = require("../warehouse/utils/verifyWarehouseOwner");
const { saveFarmerDetails,updateIndCrop,getLandDetails, getIndCropDetails,sendOTP, verifyOTP, registerName, getFarmerDetails, submitForm, createZip, createFarmer, bulkUploadFarmers, getFarmers, deletefarmer, createLand, updateLand, deleteLand, createCrop, updateCrop, deleteCrop, createBank, updateBank, deleteBank, exportFarmers, getLand, getCrop, getBank, individualfarmerList, makeAssociateFarmer, getBoFarmer, getAllFarmers, getstatedistrictname, getBoFarmerPreview, uploadFarmerDocument, getFarmerDocument,getLocationOfIpaddress, editFarmerDocument, getStates, getDistrictByState,addDistrictCity, haryanaFarmerUplod, getVerifiedAdharDetails, getStatesByPincode, getDistrictsByState } = require("./Controller");
const { verifyBO } = require("../branch-office/utils/verifyBO");
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
const { farmerList } = require("../head-office/farmer-management/Controller");

farmerRoutes.post("/" ,authenticateUser,authorizeRoles(_userType.associate), verifyAssociate, [validateFarmer, validateErrors], createFarmer);
farmerRoutes.get("/",authenticateUser,authorizeRoles(_userType.admin, _userType.associate ,_userType.bo ,_userType.ho ,_userType.agent), verifyJwtToken, getFarmers);
// farmerRoutes.put('/:id', verifyJwtToken, editFarmer);
farmerRoutes.delete("/", verifyJwtToken, deletefarmer);

farmerRoutes.post("/createLand",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken,createLand);
farmerRoutes.get("/get-land",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, getLand);

farmerRoutes.get("/get-land-details/:id",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, getLandDetails);
farmerRoutes.put("/updateLand/:land_id",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, updateLand);
farmerRoutes.put("/updateIndCrop/:farmer_id",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, updateIndCrop);
farmerRoutes.delete("/deleteLand",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, deleteLand);
farmerRoutes.post("/createCrop",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, [validateCrop, validateErrors], createCrop);
farmerRoutes.post("/createIndCrop",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, createCrop);
farmerRoutes.get("/get-crop",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, getCrop);
farmerRoutes.get("/get-crop-details",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, getIndCropDetails);
farmerRoutes.put("/updateCrop/:crop_id",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, updateCrop);
farmerRoutes.delete("/deleteCrop",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, deleteCrop);
farmerRoutes.post("/createBank",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, [validateBank, validateErrors], createBank);
farmerRoutes.get("/get-bank",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, getBank);
farmerRoutes.put("/updateBank/:bank_id",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, updateBank);
farmerRoutes.delete("/deleteBank",authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, deleteBank);
farmerRoutes.post("/bulk-upload",authenticateUser,authorizeRoles(_userType.associate), verifyAssociate, bulkUploadFarmers);
farmerRoutes.put("/edit-farmer-document",authenticateUser,authorizeRoles(_userType.associate,_userType.farmer), verifyAssociate, editFarmerDocument);
farmerRoutes.post("/bulk-export", verifyJwtToken, exportFarmers);
farmerRoutes.get("/localfarmer",authenticateUser,authorizeRoles(_userType.associate), verifyAssociate, individualfarmerList);
farmerRoutes.post("/send-farmerOTP", sendOTP)
farmerRoutes.post("/verify-farmerOTP", verifyOTP);
farmerRoutes.post('/register-details',authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, [validateRegisterDetail, validateErrors], registerName)
farmerRoutes.post("/make-associate",authenticateUser,authorizeRoles(_userType.associate), verifyAssociate, makeAssociateFarmer);
farmerRoutes.get("/getbo-farmer",authenticateUser,authorizeRoles(_userType.bo), Auth, getBoFarmer);
farmerRoutes.get("/getall-farmer",authenticateUser,authorizeRoles(_userType.agent ,_userType.admin), Auth, getAllFarmers);
farmerRoutes.get("/bo-preview/:id",authenticateUser,authorizeRoles(_userType.bo), Auth, getBoFarmerPreview);
farmerRoutes.post("/add-district",authenticateUser,authorizeRoles(_userType.admin), addDistrictCity);
farmerRoutes.put("/upload-farmer-document", Auth, uploadFarmerDocument);
farmerRoutes.get("/farmer-document",authenticateUser,authorizeRoles(_userType.admin,_userType.agent ,_userType.ho,_userType.bo,_userType.associate), Auth, getFarmerDocument);
farmerRoutes.get("/get-states", Auth, getStates);
farmerRoutes.get("/get-district-by-state/:id", Auth, getDistrictByState);
farmerRoutes.get('/get-states-by-pincode', getStatesByPincode );
farmerRoutes.get('/get-districts-by-state_id', getDistrictsByState);

/* 
 individual farmer routes 
 */
farmerRoutes.post("/send-farmerOTP", sendOTP);
farmerRoutes.post("/verify-farmerOTP", verifyOTP);
farmerRoutes.post('/register-details',authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken, [validateRegisterDetail, validateErrors], registerName)
farmerRoutes.put('/onboarding-details/:id',authenticateUser,authorizeRoles(_userType.farmer), verifyJwtToken,  [validateIndFarmer, validateErrors], saveFarmerDetails);
farmerRoutes.get('/getFarmerDetails/:id',authenticateUser,authorizeRoles(_userType.farmer),verifyJwtToken,getFarmerDetails);

farmerRoutes.put('/submit-form/:id',authenticateUser,authorizeRoles(_userType.farmer),verifyJwtToken, submitForm)

farmerRoutes.get('/download-zipFile', createZip)

farmerRoutes.post('/get-state-from-ip-address',authenticateUser,authorizeRoles(_userType.farmer),getLocationOfIpaddress)
farmerRoutes.post('/get-verified-adhar-details',authenticateUser,authorizeRoles(_userType.farmer), getVerifiedAdharDetails);
/* 
 individual farmer haryana bulkuplod
 */

farmerRoutes.post("/haryana-farmer-uplod", apiKeyAuth, haryanaFarmerUplod);
module.exports = { farmerRoutes } 
