const express = require("express");
const {
    createExternalBatch,
    listExternalBatchList,
    registerClient,
    dropdownExternalBatchList,
    listExternalOrderList,
    createExternalOrder,
    saveWarehouseOwner,
    listWarehouseOwner,
    saveWarehouseDetails,
    listWarehouseDetails,
    saveAgribidDetails,
    updateAgribidDetails
} = require("./Controller");
const { verifyThirdParty,apiKeyAuth, incrementApiUsage } = require("../utils/verifyWarehouseOwner");



const thirdPartyRoutes = express.Router();

thirdPartyRoutes.post("/register-client", registerClient);
thirdPartyRoutes.post("/external-batch", apiKeyAuth, createExternalBatch);
thirdPartyRoutes.post("/external-order", apiKeyAuth, createExternalOrder);
thirdPartyRoutes.post("/warehouse-owner", apiKeyAuth, saveWarehouseOwner);
thirdPartyRoutes.get("/warehouse-owner-list", apiKeyAuth, listWarehouseOwner);
thirdPartyRoutes.get("/dropdown-list", apiKeyAuth, dropdownExternalBatchList);
thirdPartyRoutes.get("/batch-list", apiKeyAuth, listExternalBatchList);
thirdPartyRoutes.get("/order-list", apiKeyAuth, listExternalOrderList);
thirdPartyRoutes.post("/warehouse-detail", apiKeyAuth, saveWarehouseDetails);
thirdPartyRoutes.get("/warehouse-detail-list", apiKeyAuth, listWarehouseDetails);
thirdPartyRoutes.post("/agribid", apiKeyAuth, saveAgribidDetails);
thirdPartyRoutes.post("/update-agribid", apiKeyAuth, updateAgribidDetails);



module.exports = { thirdPartyRoutes }; 