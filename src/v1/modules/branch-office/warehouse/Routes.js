const express = require("express");
const warehouseRoutes = express.Router();
const {warehousedata,  getWarehouseList, getWarehouseInword, getWarehouseOutword, getLotlist, getPurchaseOrder,getPurchaseOrderDetails,getTrackOrderStatus,getTrucks,getBatches,getBatchesByTrucks,getInwordReceivingDetails} = require('./Controller');
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index");

warehouseRoutes.post("/warehouseDetails",authenticateUser,authorizeRoles(_userType.bo),Auth, warehousedata);
warehouseRoutes.get('/warehouse-list',authenticateUser,authorizeRoles(_userType.bo),Auth, getWarehouseList)
warehouseRoutes.get('/warehouse-inword',authenticateUser,authorizeRoles(_userType.bo),Auth, getWarehouseInword)
warehouseRoutes.get('/inword-receiving-details',authenticateUser,authorizeRoles(_userType.bo),Auth, getInwordReceivingDetails)
warehouseRoutes.get('/lotlist',authenticateUser,authorizeRoles(_userType.bo),Auth, getLotlist)
warehouseRoutes.get('/warehouse-outword',authenticateUser,authorizeRoles(_userType.bo),Auth, getWarehouseOutword)
warehouseRoutes.get('/purchaseOrder',authenticateUser,authorizeRoles(_userType.bo),Auth, getPurchaseOrder)
warehouseRoutes.get('/purchaseOrderDetails',authenticateUser,authorizeRoles(_userType.bo),Auth, getPurchaseOrderDetails)
warehouseRoutes.get('/trackOrderStatus',authenticateUser,authorizeRoles(_userType.bo),Auth, getTrackOrderStatus);
warehouseRoutes.get('/tracks',authenticateUser,authorizeRoles(_userType.bo),Auth, getTrucks);
warehouseRoutes.get('/batchBytracks',authenticateUser,authorizeRoles(_userType.bo),Auth, getBatchesByTrucks);
warehouseRoutes.get('/batches',authenticateUser,authorizeRoles(_userType.bo),Auth, getBatches);

module.exports = { warehouseRoutes };