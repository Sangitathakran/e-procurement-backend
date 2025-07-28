const express = require("express");
const { getGatePassIDByWarehouse, updateWarehouseDetailsBulk,warehouseTest,getBatchesIds,updateBatchWarehouseBulks } = require("./Controllers");

const warehouseRoutes = express.Router();

// warehouseRoutes.get("/getGatePassIDByWarehouse", getGatePassIDByWarehouse);
warehouseRoutes.get("/warehouseTest", warehouseTest);
// warehouseRoutes.get("/updateWarehouseByGatePassId", updateWarehouseDetailsBulk);

warehouseRoutes.post("/getBatchesIds", getBatchesIds);
warehouseRoutes.post("/updateBatchWarehouseBulks", updateBatchWarehouseBulks);

module.exports = { warehouseRoutes }; 