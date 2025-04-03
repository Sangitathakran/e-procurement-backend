const express = require("express");
const { 
    createWhr,
    updateWhrById,
    getWhrById,
    lotList,
    batchList, 
    lotLevelDetailsUpdate, 
    whrList,
    listWHRForDropdown,
    deleteWhr,
    listWarehouseDropdown,
    whrLotDetailsUpdate,
    getWarehouseManagementList,
    filterDropdownList,
    viewBatchDetails
} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { validateForm } = require("./Validation");
const whrRoutes = express.Router();

whrRoutes.post("/create-whr", validateForm, createWhr);  /// Done
whrRoutes.put("/update-whr/:id",validateForm,updateWhrById);   /// Done
whrRoutes.get("/get-whr-details",getWhrById);  /// Done
whrRoutes.get("/batch-list", batchList);   /// Done
whrRoutes.get("/lot-list",lotList);  /// Done
whrRoutes.post("/whr-lot-detail", lotLevelDetailsUpdate);  
whrRoutes.get("/whr-list", whrList);  /// Done
whrRoutes.get("/dropdown-list/:wareHouseId", listWHRForDropdown);  /// todo
whrRoutes.post("/whr-delete", deleteWhr);  
whrRoutes.get("/dropdown-warehouse", listWarehouseDropdown);
whrRoutes.post("/update-lot-details", whrLotDetailsUpdate);
whrRoutes.get("/warehouse-management-list", getWarehouseManagementList);
whrRoutes.get("/filter-dropdown-list", filterDropdownList);
whrRoutes.get("/batch-details", viewBatchDetails);









module.exports = { whrRoutes }; 