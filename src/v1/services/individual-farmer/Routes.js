<<<<<<< HEAD
const express = require ("express");
const router = express.Router();
const {sendOTP,verifyOTP} = require("./Controller") 


router.post("/sendOTP",sendOTP)
router.post("/verifyOTP",verifyOTP);



module.exports = { router }
=======
const express = require("express");
const individualFarmerRoutes = express.Router();
const { body } = require("express-validator");
const { getVariety, getVarietyById, createVariety, updateVariety, getUnit, getUnitById, createUnit, updateUnit, deleteUnit, deleteVariety, getGrade, getGradeById, createGrade, updateGrade, deleteGrade, getOrganizations, updateOrganization, createOrganization } = require("./Controller");
const { _middleware } = require("@src/v1/utils/constants/messages");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { _status } = require("@src/v1/utils/constants/index");

individualFarmerRoutes.get('/basic-details',)

module.exports={individualFarmerRoutes}
>>>>>>> a949abd201b52834bb03efca7758b4c7faf2bf21
