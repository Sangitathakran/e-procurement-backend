const express = require("express");
const { getPenaltyOrder, batchList, waiveOff } = require("./Controller");
const nccfPenaltyRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");

nccfPenaltyRoutes.get("/", getPenaltyOrder);
nccfPenaltyRoutes.get("/batchList", batchList);
nccfPenaltyRoutes.put("/waiveOff", waiveOff);


module.exports = { nccfPenaltyRoutes }; 
