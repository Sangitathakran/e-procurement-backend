const express = require("express");
const { getAssociates, updateOrInsertUsers, addFarmers, addProcureallPaymentOrdersmentCenter, updateOrInsertUsersTesting, associateFarmerList,
    createOfferOrder, addProcurementCenter, getProcurementCenter, getProcurementCenterTesting, getEkhridJFormId, getMandiName, getAllMandiName, totalQty,
    allPaymentOrders, getBatchIds, updateBatchIds, totalQtyFarmerOrder, ekhridFarmerOrderMapping,
    getNewJformIds, totalQtyRania, totalQtyBarwala, getBatchIdandDeletePayment, getTodaysfarmerOrder, checkJformIdsExist,
     ekhridProcrementExport, associateMandiName, updateAssociateMandiId, sunflowerMandiName, sunflowerMandiWiseDataExport,
      checkFinalJformIdsExist, ekhridExport, updateAssociateName, 
      notIncludedJformId} = require("./Controllers");

const associateMngmntRoutes = express.Router();

associateMngmntRoutes.get("/", getAssociates);
associateMngmntRoutes.get("/updateOrInsertUsers", updateOrInsertUsers);
associateMngmntRoutes.get("/updateOrInsertUsersTesting", updateOrInsertUsersTesting);
associateMngmntRoutes.get("/addFarmers", addFarmers);
associateMngmntRoutes.get("/addProcurementCenter", addProcurementCenter);
associateMngmntRoutes.get("/getProcurementCenter", getProcurementCenter);
associateMngmntRoutes.get("/getProcurementCenterTesting", getProcurementCenterTesting);
associateMngmntRoutes.post("/associateFarmerList", associateFarmerList);
associateMngmntRoutes.post("/createOfferOrder", createOfferOrder);

associateMngmntRoutes.get("/getMandiName", getMandiName);
associateMngmntRoutes.get("/getAllMandiName", getAllMandiName);

associateMngmntRoutes.get("/totalQty", totalQty);
associateMngmntRoutes.get("/getEkhridJFormId", getEkhridJFormId);

associateMngmntRoutes.get("/allPaymentOrders", allPaymentOrders);
associateMngmntRoutes.get("/getBatchIds", getBatchIds);
associateMngmntRoutes.get("/updateBatchIds", updateBatchIds);

associateMngmntRoutes.get("/totalQtyFarmerOrder", totalQtyFarmerOrder);
associateMngmntRoutes.get("/ekhridFarmerOrderMapping", ekhridFarmerOrderMapping);
associateMngmntRoutes.get('/test', getNewJformIds);
associateMngmntRoutes.get('/totalQtyRania', totalQtyRania);
associateMngmntRoutes.get('/totalQtyBarwala', totalQtyBarwala);
associateMngmntRoutes.get('/getBatchIdandDeletePayment', getBatchIdandDeletePayment);
associateMngmntRoutes.get('/getTodaysfarmerOrder', getTodaysfarmerOrder);
associateMngmntRoutes.get('/checkJformIdsExist', checkJformIdsExist);

associateMngmntRoutes.get('/ekhridProcrementExport', ekhridProcrementExport);

associateMngmntRoutes.get('/associateMandiName', associateMandiName);
associateMngmntRoutes.get('/updateAssociateMandiId', updateAssociateMandiId);

associateMngmntRoutes.get('/sunflowerMandiName', sunflowerMandiName);
associateMngmntRoutes.get('/sunflowerMandiWiseDataExport', sunflowerMandiWiseDataExport);
associateMngmntRoutes.get('/checkFinalJformIdsExist', checkFinalJformIdsExist);
associateMngmntRoutes.get('/ekhridExport', ekhridExport);

associateMngmntRoutes.get('/updateAssociateName', updateAssociateName);
associateMngmntRoutes.get('/notIncludedJformId', notIncludedJformId);
module.exports = { associateMngmntRoutes }; 