const express = require("express");
const { editBatchDetails, viewBatchDetails, getBatchesByWarehouse, batchApproveOrReject, lot_list } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseInwardRoutes = express.Router();

wareHouseInwardRoutes.post("/batch-list", verifyWarehouseOwner, getBatchesByWarehouse);
wareHouseInwardRoutes.put("/batch-approval", verifyWarehouseOwner, batchApproveOrReject);
wareHouseInwardRoutes.get("/lot-list", verifyWarehouseOwner, lot_list);
wareHouseInwardRoutes.get("/batch-details", verifyWarehouseOwner, viewBatchDetails);
wareHouseInwardRoutes.put("/batch-edit", verifyWarehouseOwner, editBatchDetails);



module.exports = { wareHouseInwardRoutes }; 