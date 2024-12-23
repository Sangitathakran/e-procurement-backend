const express = require("express");
const { editBatchDetails, viewBatchDetails, getBatchesByWarehouse, batchApproveOrReject, lot_list } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");


const wareHouseInwardRoutes = express.Router();

wareHouseInwardRoutes.get("/batch-list/:warehouseOwnerId", getBatchesByWarehouse);
wareHouseInwardRoutes.put("/batch-approval", verifyWarehouseOwner, batchApproveOrReject);
wareHouseInwardRoutes.get("/lot-list", lot_list);
wareHouseInwardRoutes.get("/batch-details", viewBatchDetails);
wareHouseInwardRoutes.put("/batch-edit", verifyWarehouseOwner, editBatchDetails);



module.exports = { wareHouseInwardRoutes }; 