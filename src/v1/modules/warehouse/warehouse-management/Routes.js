const express = require("express");
const { saveWarehouseDetails, editWarehouseDetails, getWarehouseList } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");


const wareHouseManagement = express.Router();

wareHouseManagement.post("/add-warehouse", verifyWarehouseOwner, saveWarehouseDetails);
wareHouseManagement.put("/edit-warehouse", verifyWarehouseOwner, editWarehouseDetails);
wareHouseManagement.post("/warehouse-list", verifyWarehouseOwner, getWarehouseList);



module.exports = { wareHouseManagement }; 