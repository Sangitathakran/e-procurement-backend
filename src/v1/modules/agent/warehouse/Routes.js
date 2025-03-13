const express = require("express");
const warehouseRoutes = express.Router();

const {warehousedata, warehouseList, getWarehouseList, getWarehouseInword, getWarehouseOutword, getLotlist, getPurchaseOrder,getPurchaseOrderDetails,getTrackOrderStatus,getTrucks,getBatches,getBatchesByTrucks,getInwordReceivingDetails} = require('./Controller');
const { Auth } = require("@src/v1/middlewares/jwt");

warehouseRoutes.post("/warehouseDetails", warehousedata);
warehouseRoutes.get('/warehouse-list',Auth, getWarehouseList)
warehouseRoutes.get('/warehouse-inword',Auth, getWarehouseInword)
warehouseRoutes.get('/inword-receiving-details',Auth, getInwordReceivingDetails)
warehouseRoutes.get('/lotlist',Auth, getLotlist)
warehouseRoutes.get('/warehouse-outword',Auth, getWarehouseOutword)
warehouseRoutes.get('/purchaseOrder',Auth, getPurchaseOrder)
warehouseRoutes.get('/purchaseOrderDetails',Auth, getPurchaseOrderDetails)
warehouseRoutes.get('/trackOrderStatus',Auth, getTrackOrderStatus);
warehouseRoutes.get('/tracks',Auth, getTrucks);
warehouseRoutes.get('/batchBytracks',Auth, getBatchesByTrucks);
warehouseRoutes.get('/batches',Auth, getBatches);

module.exports = {warehouseRoutes};
