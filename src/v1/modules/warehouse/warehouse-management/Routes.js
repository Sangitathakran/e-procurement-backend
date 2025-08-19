const express = require("express");
const { saveWarehouseDetails, editWarehouseDetails, getWarehouseList, updateWarehouseStatus, getWarehouseDashboardStats, warehouseFilterList } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

const wareHouseManagement = express.Router();

wareHouseManagement.post("/add-warehouse",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, saveWarehouseDetails);
wareHouseManagement.put("/edit-warehouse",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, editWarehouseDetails);
wareHouseManagement.post("/warehouse-list",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, getWarehouseList);
wareHouseManagement.put("/warehouse-status/:id",authenticateUser,authorizeRoles(_userType.warehouse), verifyWarehouseOwner, updateWarehouseStatus);
wareHouseManagement.get("/get-warehouse-dashboardStats",authenticateUser,authorizeRoles(_userType.warehouse),verifyWarehouseOwner, getWarehouseDashboardStats)
wareHouseManagement.get("/get-warehouse-filter-list",authenticateUser,authorizeRoles(_userType.warehouse),verifyWarehouseOwner, warehouseFilterList)



module.exports = { wareHouseManagement }; 