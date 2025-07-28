const express = require("express");
const distillerWarehouseRoutes = express.Router();
const { _userType } = require("@src/v1/utils/constants/index")
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { warehouseList } = require('./Controller');

distillerWarehouseRoutes.get('/',authenticateUser,authorizeRoles(_userType.distiller),Auth, warehouseList)

module.exports = { distillerWarehouseRoutes };