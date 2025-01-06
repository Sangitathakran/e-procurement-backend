const express = require("express");
const { getAgency, createAgency, changeStatus } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/nccf/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");


const nccfAuthRoutes = express.Router();

nccfAuthRoutes.get("/", Auth,  getAgency);
nccfAuthRoutes.post("/", Auth, validateForm, createAgency);
nccfAuthRoutes.put("/:id", Auth, changeStatus);


module.exports = { nccfAuthRoutes }; 