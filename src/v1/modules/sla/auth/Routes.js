const express = require("express");
const { getAgency, createAgency, changeStatus } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");


const agencyMngmntRoutes = express.Router();

agencyMngmntRoutes.get("/", Auth,  getAgency);
agencyMngmntRoutes.post("/", Auth, validateForm, createAgency);
agencyMngmntRoutes.put("/:id", Auth, changeStatus);


module.exports = { agencyMngmntRoutes }; 