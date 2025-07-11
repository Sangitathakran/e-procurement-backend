const { getOrders, batchList, getOrderById, warehouseList, requiredStockUpdate, batchstatusUpdate,
    scheduleListList, batchscheduleDateUpdate, batchRejectedList, penaltyApply } = require("./Controller")
const { validateForm } = require("@src/v1/modules/distiller/auth/Validation")
const express = require("express");
const { Auth } = require("@src/v1/middlewares/jwt");
const nccfOrderRoutes = express.Router();
const {authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")

nccfOrderRoutes.get("/",authenticateUser,authorizeRoles(_userType.nccf), Auth, getOrders);
nccfOrderRoutes.get("/batchList",authenticateUser,authorizeRoles(_userType.nccf), Auth, batchList);
nccfOrderRoutes.get('/batchRejectedList',authenticateUser,authorizeRoles(_userType.nccf), Auth, batchRejectedList);
nccfOrderRoutes.get("/scheduleList",authenticateUser,authorizeRoles(_userType.nccf), Auth, scheduleListList);
nccfOrderRoutes.get('/warehouseList',authenticateUser,authorizeRoles(_userType.nccf), Auth, warehouseList);

nccfOrderRoutes.get('/:id',authenticateUser,authorizeRoles(_userType.nccf), Auth, getOrderById);
nccfOrderRoutes.put("/requiredStockUpdate",authenticateUser,authorizeRoles(_userType.nccf), Auth, requiredStockUpdate);
nccfOrderRoutes.put("/batchstatusUpdate",authenticateUser,authorizeRoles(_userType.nccf), Auth, batchstatusUpdate);
nccfOrderRoutes.put("/batchscheduleDateUpdate",authenticateUser,authorizeRoles(_userType.nccf), Auth, batchscheduleDateUpdate);
nccfOrderRoutes.put("/penalty-apply",authenticateUser,authorizeRoles(_userType.nccf), Auth, penaltyApply);

module.exports = { nccfOrderRoutes }; 
