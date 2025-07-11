const express = require("express");
const { warehouseList, requiredStockUpdate } = require("./Controller");
const nccfInventoryRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

nccfInventoryRoutes.get("/warehouseList",authenticateUser,authorizeRoles(_userType.nccf), Auth, warehouseList);
nccfInventoryRoutes.put("/requiredStockUpdate",authenticateUser,authorizeRoles(_userType.nccf), Auth, requiredStockUpdate);

module.exports = { nccfInventoryRoutes }; 
