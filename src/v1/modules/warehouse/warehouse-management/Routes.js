const express = require("express");
const { saveWarehouseDetails, editWarehouseDetails, getWarehouseList, updateWarehouseStatus, getWarehouseDashboardStats, warehouseFilterList } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");


const wareHouseManagement = express.Router();

wareHouseManagement.post("/add-warehouse", verifyWarehouseOwner, saveWarehouseDetails);
wareHouseManagement.put("/edit-warehouse", verifyWarehouseOwner, editWarehouseDetails);
wareHouseManagement.post("/warehouse-list", verifyWarehouseOwner, getWarehouseList);
wareHouseManagement.put("/warehouse-status/:id", verifyWarehouseOwner, updateWarehouseStatus);
wareHouseManagement.get("/get-warehouse-dashboardStats",verifyWarehouseOwner, getWarehouseDashboardStats)
wareHouseManagement.get("/get-warehouse-filter-list",verifyWarehouseOwner, warehouseFilterList)



module.exports = { wareHouseManagement }; 