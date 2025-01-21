const express = require("express");
const { 
    editBatchDetails, 
    viewBatchDetails, 
    getBatchesByWarehouse, 
    batchApproveOrReject, 
    lot_list,
    batchStatusUpdate,
    batchMarkDelivered 
} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseInwardRoutes = express.Router();

wareHouseInwardRoutes.get("/batch-list", verifyWarehouseOwner, getBatchesByWarehouse);
wareHouseInwardRoutes.put("/batch-approval", verifyWarehouseOwner, batchApproveOrReject);
wareHouseInwardRoutes.get("/lot-list", verifyWarehouseOwner, lot_list);
wareHouseInwardRoutes.get("/batch-details", verifyWarehouseOwner, viewBatchDetails);
wareHouseInwardRoutes.put("/batch-edit", verifyWarehouseOwner, editBatchDetails);
wareHouseInwardRoutes.put("/batch-status-update", batchStatusUpdate);
wareHouseInwardRoutes.put("/mark-delivered", batchMarkDelivered);





module.exports = { wareHouseInwardRoutes }; 