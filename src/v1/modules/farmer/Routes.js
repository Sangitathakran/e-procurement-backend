const express = require("express")
const farmerRoutes = express.Router()

const {associateFarmerRoutes} = require("./associate-farmer/Routes")
const {individualFarmerRoutes} = require("./individual-farmer/Routes")



farmerRoutes.use("/associate", associateFarmerRoutes)
farmerRoutes.use("/ivd", individualFarmerRoutes)

module.exports = { farmerRoutes } 
