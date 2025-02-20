const express = require("express");
const { 
    createWhr,
    updateWhrById,
    getWhrById,
    lotList,
    batchList, 
    lotLevelDetailsUpdate, 
    whrList
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



module.exports = { whrRoutes }; 