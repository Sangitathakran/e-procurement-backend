const express = require("express");
const { orderList, getPuchaseList, getPurchaseOrderById, trackOrder, readyToShip, inTransit, getBatches, fetchBatches, getStatus, getTrucks,batchOrderStatsData, rejectTrack, createExternalOrder, listExternalbatch, listExternalOrderList, viewDetails, transitVeiw, shippedView } = require("./Controller");
// const { orderList, getPuchaseList, getPurchaseOrderById, trackOrder, readyToShip, inTransit, getBatches, fetchBatches, getStatus, getTrucks, rejectTrack } = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseOutwardRoutes = express.Router();

wareHouseOutwardRoutes.get("/batch-list/:id", verifyWarehouseOwner, fetchBatches);
wareHouseOutwardRoutes.get("/order-list", verifyWarehouseOwner, orderList);
wareHouseOutwardRoutes.get("/purchase-list", verifyWarehouseOwner, getPuchaseList);
wareHouseOutwardRoutes.get("/purchase-order/:id", verifyWarehouseOwner, getPurchaseOrderById);
wareHouseOutwardRoutes.post("/track/ready-to-ship", verifyWarehouseOwner, readyToShip);
wareHouseOutwardRoutes.post("/track/in-transit", verifyWarehouseOwner, inTransit);
wareHouseOutwardRoutes.get("/batches/:id", verifyWarehouseOwner, getBatches);
wareHouseOutwardRoutes.get("/status/:id", verifyWarehouseOwner, getStatus);
wareHouseOutwardRoutes.get("/truck/:id", verifyWarehouseOwner, getTrucks);
wareHouseOutwardRoutes.get("/batch-order-stats",verifyWarehouseOwner, batchOrderStatsData);
wareHouseOutwardRoutes.put("/reject" , verifyWarehouseOwner , rejectTrack) ;
wareHouseOutwardRoutes.post("/external-order"  ,verifyWarehouseOwner, createExternalOrder);
wareHouseOutwardRoutes.get("/list-external-batch", verifyWarehouseOwner, listExternalbatch);
wareHouseOutwardRoutes.get("/list-external-order", verifyWarehouseOwner, listExternalOrderList);
wareHouseOutwardRoutes.get("/shipped-view/:id"  , verifyWarehouseOwner , shippedView) ; 
wareHouseOutwardRoutes.get("/transit-view/:id"  , verifyWarehouseOwner, transitVeiw)


module.exports = { wareHouseOutwardRoutes }; 