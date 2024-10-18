const express = require("express");
const { getAgency, createAgency } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/auth/Validation");
const { verifyJwtToken } = require("@src/v1/middlewares/jwt");


const agencyMngmntRoutes = express.Router();

agencyMngmntRoutes.get("/", verifyJwtToken,  getAgency);
agencyMngmntRoutes.post("/", verifyJwtToken, validateForm, createAgency);


module.exports = { agencyMngmntRoutes }; 