const express = require("express");
const { saveWarehouseDetails, editWarehouseDetails, getWarehouseList, updateWarehouseStatus } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");


const wareHouseManagement = express.Router();

wareHouseManagement.post("/add-warehouse", verifyWarehouseOwner, saveWarehouseDetails);
wareHouseManagement.put("/edit-warehouse", verifyWarehouseOwner, editWarehouseDetails);
wareHouseManagement.post("/warehouse-list", verifyWarehouseOwner, getWarehouseList);
wareHouseManagement.put("/warehouse-status/:id", verifyWarehouseOwner, updateWarehouseStatus);



module.exports = { wareHouseManagement }; 