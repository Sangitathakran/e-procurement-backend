const express = require("express");
const {orderList,getPuchaseList,getPurchaseOrderById, trackOrder, readyToShip, inTransit, getBatches, fetchBatches, getStatus , getTrucks} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseOutwardRoutes = express.Router();

wareHouseOutwardRoutes.get("/batch-list/:id" , verifyWarehouseOwner , fetchBatches) ;
wareHouseOutwardRoutes.get("/order-list",verifyWarehouseOwner, orderList);
wareHouseOutwardRoutes.get("/purchase-list",verifyWarehouseOwner, getPuchaseList);
wareHouseOutwardRoutes.get("/purchase-order/:id", verifyWarehouseOwner, getPurchaseOrderById);
wareHouseOutwardRoutes.post("/track/ready-to-ship"   , readyToShip) ; 
wareHouseOutwardRoutes.post("/track/in-transit"  , inTransit) ; 
wareHouseOutwardRoutes.get("/batches/:id"  ,getBatches ) ; 
wareHouseOutwardRoutes.get("/status/:id"  , getStatus ) ; 
wareHouseOutwardRoutes.get("/truck/:id"  , verifyWarehouseOwner , getTrucks) ;


module.exports = { wareHouseOutwardRoutes }; 