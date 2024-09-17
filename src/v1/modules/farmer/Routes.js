const express = require("express")
const farmerRoutes = express.Router()

const associate_farmer_routes = require("./associate-farmer/Routes")
const individual_farmer_routes = require("./individual-farmer/Routes")



farmerRoutes.use("/associate", associate_farmer_routes)
farmerRoutes.use("/ivd", individual_farmer_routes)

module.exports = farmerRoutes 
