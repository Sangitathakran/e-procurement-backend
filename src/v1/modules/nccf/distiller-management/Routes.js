const express = require("express");
const { getDistiller, bulkuplodDistiller, getDistillerById } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/nccf/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");


const distillerManagementRoute = express.Router();

distillerManagementRoute.get("/", Auth,  getDistiller);
distillerManagementRoute.get('/:id', Auth, getDistillerById);
distillerManagementRoute.post("/dist-bulkuplod", Auth, bulkuplodDistiller);

module.exports = { distillerManagementRoute }; 