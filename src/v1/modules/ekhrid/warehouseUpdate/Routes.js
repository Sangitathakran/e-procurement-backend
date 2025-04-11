const express = require("express");
const { getGatePassIDByWarehouse, updateWarehouseDetailsBulk,warehouseTest,getBatchesIds,updateBatchWarehouseBulks } = require("./Controllers");

const warehouseRoutes = express.Router();

// warehouseRoutes.get("/getGatePassIDByWarehouse", getGatePassIDByWarehouse);
warehouseRoutes.get("/warehouseTest", warehouseTest);
// warehouseRoutes.get("/updateWarehouseByGatePassId", updateWarehouseDetailsBulk);

warehouseRoutes.get("/getBatchesIds", getBatchesIds);
warehouseRoutes.get("/updateBatchWarehouseBulks", updateBatchWarehouseBulks);

module.exports = { warehouseRoutes }; 