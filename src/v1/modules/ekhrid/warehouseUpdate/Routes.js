const express = require("express");
const { getGatePassIDByWarehouse, updateWarehouseDetailsBulk } = require("./Controllers");

const warehouseRoutes = express.Router();

warehouseRoutes.get("/getGatePassIDByWarehouse", getGatePassIDByWarehouse);
warehouseRoutes.get("/updateWarehouseByGatePassId", updateWarehouseDetailsBulk);

module.exports = { warehouseRoutes }; 