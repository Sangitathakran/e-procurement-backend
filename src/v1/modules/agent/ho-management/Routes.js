const express = require("express");
const { getHo, saveHeadOffice } = require("./Controllers");
const { validateForm } = require("@src/v1/modules/agent/ho-management/Validation")

const hoMngmntRoutes = express.Router();


hoMngmntRoutes.get("/", getHo);
hoMngmntRoutes.post("/", validateForm, saveHeadOffice);


module.exports = { hoMngmntRoutes }; 