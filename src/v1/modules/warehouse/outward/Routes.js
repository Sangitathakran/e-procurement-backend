const express = require("express");
const { orderList, getPuchaseList, getPurchaseOrderById, trackOrder, readyToShip, inTransit, getBatches, fetchBatches, getStatus, getTrucks, rejectTrack } = require("./Controller");
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
wareHouseOutwardRoutes.put("/reject" , verifyWarehouseOwner , rejectTrack) ;


module.exports = { wareHouseOutwardRoutes }; 