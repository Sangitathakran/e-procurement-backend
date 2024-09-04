const express = require("express");
const individualFarmerRoutes = express.Router();
const { body } = require("express-validator");
const { getVariety, getVarietyById, createVariety, updateVariety, getUnit, getUnitById, createUnit, updateUnit, deleteUnit, deleteVariety, getGrade, getGradeById, createGrade, updateGrade, deleteGrade, getOrganizations, updateOrganization, createOrganization } = require("./Controller");
const { _middleware } = require("@src/v1/utils/constants/messages");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { _status } = require("@src/v1/utils/constants/index");
const {saveFarmerDetails} =require('./Controller')
const { verifyJwtToken,generateJwtToken } = require("@src/v1/utils/helpers/jwt");
//console.log(generateJwtToken({mobile_no:"8864995639"}))
individualFarmerRoutes.put('/onboarding-details/:id',verifyJwtToken,saveFarmerDetails);

module.exports={individualFarmerRoutes}