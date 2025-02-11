const express = require("express");
const {
    createExternalBatch,
    listExternalBatchList,
    registerClient,
    dropdownExternalBatchList,
    listExternalOrderList,
    createExternalOrder,
    saveWarehouseOwner
} = require("./Controller");
const { verifyThirdParty,apiKeyAuth, incrementApiUsage } = require("../utils/verifyWarehouseOwner");



const thirdPartyRoutes = express.Router();

thirdPartyRoutes.post("/register-client", registerClient);
thirdPartyRoutes.post("/external-batch", apiKeyAuth, createExternalBatch);
thirdPartyRoutes.post("/external-order", apiKeyAuth, createExternalOrder);
thirdPartyRoutes.post("/warehouse-owner", apiKeyAuth, saveWarehouseOwner);



thirdPartyRoutes.get("/dropdown-list", apiKeyAuth, dropdownExternalBatchList);
thirdPartyRoutes.get("/batch-list", apiKeyAuth, listExternalBatchList);
thirdPartyRoutes.get("/order-list", apiKeyAuth, listExternalOrderList);



module.exports = { thirdPartyRoutes }; 