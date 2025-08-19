
const express = require("express");
const {updateDistilleryStats} = require("@modules/nafed-apis/controller");

const nafedRoutes = express.Router();

nafedRoutes.post("/api_sevices", updateDistilleryStats);


module.exports = { nafedRoutes }; 