const express = require("express");
const { getPenaltyOrder, batchList, waiveOff, updatePenaltyAmount } = require("./Controller");
const nccfPenaltyRoutes = express.Router();
const { Auth } = require("@src/v1/middlewares/jwt");

nccfPenaltyRoutes.get("/", Auth, getPenaltyOrder);
nccfPenaltyRoutes.get("/batchList", Auth, batchList);
nccfPenaltyRoutes.put("/waiveOff", Auth, waiveOff);
nccfPenaltyRoutes.put("/penalty-amount/:batchId", Auth, updatePenaltyAmount);

module.exports = { nccfPenaltyRoutes };
