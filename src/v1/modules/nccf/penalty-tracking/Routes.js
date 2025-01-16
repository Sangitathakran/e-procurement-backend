const express = require("express");
const { getPenaltyOrder, batchList, waiveOff } = require("./Controller");
const nccfPenaltyRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");

nccfPenaltyRoutes.get("/", Auth, getPenaltyOrder);
nccfPenaltyRoutes.get("/batchList", Auth, batchList);
nccfPenaltyRoutes.put("/waiveOff", Auth, waiveOff);

module.exports = { nccfPenaltyRoutes }; 