const express = require("express");
const { getAgency, createAgency } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");


const agencyMngmntRoutes = express.Router();

agencyMngmntRoutes.get("/", Auth,  getAgency);
agencyMngmntRoutes.post("/", Auth, validateForm, createAgency);


module.exports = { agencyMngmntRoutes }; 