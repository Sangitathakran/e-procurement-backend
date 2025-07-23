const express = require("express")
const FeatureRoutes = express.Router()
const { Auth ,authenticateUser,authorizeRoles,} = require("@src/v1/middlewares/jwt")
const { _userType } = require("@src/v1/utils/constants/index")
const { createFeature , createSubFeature } = require("./Controller")


FeatureRoutes.post('/createFeature',authenticateUser,authorizeRoles(_userType.admin ), createFeature)
FeatureRoutes.post('/createSubFeature/:featureCode',authenticateUser,authorizeRoles(_userType.admin ), createSubFeature)



module.exports = { FeatureRoutes }

 

