const express = require("express");
const { 
    editBatchDetails, 
    viewBatchDetails, 
    getBatchesByWarehouse, 
    batchApproveOrReject, 
    lot_list,
    batchStatusUpdate,
    batchMarkDelivered,
    getReceivedBatchesByWarehouse,
    getPendingBatchesByWarehouse,
    batchStatsData,
    getFilterBatchList ,
    createExternalBatch,
    listExternalBatchList,
    whrReceiptImageUpdate
} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth ,commonAuth} = require("@src/v1/middlewares/jwt")
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const wareHouseInwardRoutes = express.Router();

wareHouseInwardRoutes.get("/received-batch-list",authenticateUser,authorizeRoles(_userType.warehouse),commonAuth, getReceivedBatchesByWarehouse);
wareHouseInwardRoutes.put("/whr_receipt_image-update/:batchId",authenticateUser,authorizeRoles(_userType.warehouse),commonAuth, whrReceiptImageUpdate);

wareHouseInwardRoutes.get("/pending-batch-list",authenticateUser,authorizeRoles(_userType.warehouse),commonAuth, getPendingBatchesByWarehouse);
wareHouseInwardRoutes.put("/batch-approval", authenticateUser,authorizeRoles(_userType.warehouse),verifyWarehouseOwner, batchApproveOrReject);
wareHouseInwardRoutes.get("/lot-list",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, lot_list);
wareHouseInwardRoutes.get("/batch-details",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, viewBatchDetails);
wareHouseInwardRoutes.put("/batch-edit",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, editBatchDetails);
wareHouseInwardRoutes.put("/batch-status-update",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, batchStatusUpdate);
wareHouseInwardRoutes.put("/mark-delivered",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, batchMarkDelivered);
wareHouseInwardRoutes.get("/batch-stats",authenticateUser,authorizeRoles(_userType.warehouse) ,verifyWarehouseOwner, batchStatsData);
wareHouseInwardRoutes.get("/filter-batch-list",authenticateUser,authorizeRoles(_userType.warehouse),verifyWarehouseOwner, getFilterBatchList)
wareHouseInwardRoutes.post("/external-batch",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, createExternalBatch);
wareHouseInwardRoutes.get("/external-batch-list",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, listExternalBatchList)






module.exports = { wareHouseInwardRoutes }; 