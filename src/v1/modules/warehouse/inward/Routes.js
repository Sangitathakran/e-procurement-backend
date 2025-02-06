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
    listExternalBatchList
} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseInwardRoutes = express.Router();

wareHouseInwardRoutes.get("/received-batch-list", getReceivedBatchesByWarehouse);
wareHouseInwardRoutes.get("/pending-batch-list", getPendingBatchesByWarehouse);
wareHouseInwardRoutes.put("/batch-approval", verifyWarehouseOwner, batchApproveOrReject);
wareHouseInwardRoutes.get("/lot-list", verifyWarehouseOwner, lot_list);
wareHouseInwardRoutes.get("/batch-details", verifyWarehouseOwner, viewBatchDetails);
wareHouseInwardRoutes.put("/batch-edit", verifyWarehouseOwner, editBatchDetails);
wareHouseInwardRoutes.put("/batch-status-update", verifyWarehouseOwner, batchStatusUpdate);
wareHouseInwardRoutes.put("/mark-delivered", verifyWarehouseOwner, batchMarkDelivered);
wareHouseInwardRoutes.get("/batch-stats", verifyWarehouseOwner, batchStatsData);
wareHouseInwardRoutes.get("/filter-batch-list",verifyWarehouseOwner, getFilterBatchList)
wareHouseInwardRoutes.post("/external-batch", verifyWarehouseOwner, createExternalBatch);
wareHouseInwardRoutes.get("/external-batch-list", verifyWarehouseOwner, listExternalBatchList)






module.exports = { wareHouseInwardRoutes }; 