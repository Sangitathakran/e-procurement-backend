const express = require("express");
const {orderList,getPuchaseList, trackOrder, readyToShip, inTransit, getBatches} = require("./Controller");
const { verifyWarehouseOwner } = require("../utils/verifyWarehouseOwner");
const { Auth } = require("@src/v1/middlewares/jwt")


const wareHouseOutwardRoutes = express.Router();

wareHouseOutwardRoutes.get("/order-list", orderList);
wareHouseOutwardRoutes.get("/purchase-list", getPuchaseList);
wareHouseOutwardRoutes.post("/track/ready-to-ship" , readyToShip) ; 
wareHouseOutwardRoutes.post("/track/in-transit" , inTransit) ; 
wareHouseOutwardRoutes.get("/batches/:id" , getBatches ) ; 



module.exports = { wareHouseOutwardRoutes }; 