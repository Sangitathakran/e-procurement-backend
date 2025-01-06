const express = require("express");
const { getNccf, createNccf, changeStatus } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/nccf/auth/Validation");
const { Auth } = require("@src/v1/middlewares/jwt");


const nccfAuthRoutes = express.Router();

nccfAuthRoutes.get("/", Auth,  getNccf);
// nccfAuthRoutes.post("/", Auth, validateForm, createNccf);
nccfAuthRoutes.post("/", validateForm, createNccf);
nccfAuthRoutes.put("/:id", Auth, changeStatus);

module.exports = { nccfAuthRoutes }; 