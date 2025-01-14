const express = require("express");
const { getPenaltyOrder, batchList } = require("./Controller");
const nccfPenaltyRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");

nccfPenaltyRoutes.get("/", getPenaltyOrder);
nccfPenaltyRoutes.get("/batchList", batchList);

module.exports = { nccfPenaltyRoutes }; 
