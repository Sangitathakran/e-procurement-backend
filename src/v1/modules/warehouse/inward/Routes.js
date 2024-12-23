const express = require("express");
const { editBatchDetails, viewBatchDetails, getBatchesByWarehouse, batchApproveOrReject, lot_list } = require("./Controller");
const { Auth } = require("@src/v1/middlewares/jwt")

const wareHouseInwardRoutes = express.Router();

wareHouseInwardRoutes.get("/batch-list", Auth, getBatchesByWarehouse);
wareHouseInwardRoutes.put("/batch-approval", Auth, batchApproveOrReject);
wareHouseInwardRoutes.get("/lot-list", Auth, lot_list);
wareHouseInwardRoutes.get("/batch-details", Auth, viewBatchDetails);
wareHouseInwardRoutes.put("/batch-edit", Auth, editBatchDetails);



module.exports = { wareHouseInwardRoutes }; 