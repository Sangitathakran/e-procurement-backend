const express = require("express");
const individualFarmerRoutes = express.Router();
const { body } = require("express-validator");
const { getVariety, getVarietyById, createVariety, updateVariety, getUnit, getUnitById, createUnit, updateUnit, deleteUnit, deleteVariety, getGrade, getGradeById, createGrade, updateGrade, deleteGrade, getOrganizations, updateOrganization, createOrganization, sendOTP, verifyOTP} = require("./Controller");
const { _middleware } = require("@src/v1/utils/constants/messages");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { _status } = require("@src/v1/utils/constants/index");

individualFarmerRoutes.get('/basic-details',)
individualFarmerRoutes.post("/send-formerOTP",sendOTP)
individualFarmerRoutes.post("/verify-formerOTP",verifyOTP);

module.exports={individualFarmerRoutes}
