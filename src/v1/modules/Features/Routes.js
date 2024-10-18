const express = require("express")
const FeatureRoutes = express.Router()

const { createFeature , createSubFeature } = require("./Controller")

FeatureRoutes.post('/createFeature', createFeature)
FeatureRoutes.post('/createSubFeature/:featureCode', createSubFeature)



module.exports = { FeatureRoutes }

 

