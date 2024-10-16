const express = require("express");
const { getAgency, createAgency } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/auth/Validation");


const agencyMngmntRoutes = express.Router();

agencyMngmntRoutes.get("/", getAgency);
agencyMngmntRoutes.post("/", validateForm, createAgency);


module.exports = { agencyMngmntRoutes }; 