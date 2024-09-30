const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { getProcurementCenter, createProcurementCenter, ImportProcurementCenter, generateCenterCode, getHoProcurementCenter } = require("./Controller");
const express = require("express");
const { verifyAssociate } = require("../utils/verifyBO");
const procurementCenterRoutes = express.Router();
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");

procurementCenterRoutes.get("/", verifyAssociate, getProcurementCenter);
procurementCenterRoutes.post("/import-centers", ImportProcurementCenter);
procurementCenterRoutes.post("/generateCenterCode", generateCenterCode);
procurementCenterRoutes.post("/", validateErrors, verifyAssociate, createProcurementCenter, [
    body("center_name", _middleware.require("center_name")).notEmpty().trim(),
    body("center_code", _middleware.require("center_code")).notEmpty().trim(),
    body("line1", _middleware.require("line1")).notEmpty().trim(),
    body("line2").optional().trim(),
    body("country", _middleware.require("country")).notEmpty().trim(),
    body("state", _middleware.require("state")).notEmpty().trim(),
    body("district", _middleware.require("district")).notEmpty().trim(),
    body("city", _middleware.require("city")).notEmpty().trim(),
    body("postalCode", _middleware.require("postalCode")).notEmpty().trim(),
    body("name", _middleware.require("name")).notEmpty().trim(),
    body("email", _middleware.require("email")).notEmpty().trim(),
    body("mobile", _middleware.require("mobile")).notEmpty().trim(),
    body("designation", _middleware.require("designation")).notEmpty().trim(),
    body("aadhar_number", _middleware.require("aadhar_number")).notEmpty().trim(),
    body("aadhar_image", _middleware.require("aadhar_image")).notEmpty().trim(),
    body("location_url", _middleware.require("location_url")).notEmpty().trim(),
    body("addressType", _middleware.require("addressType")).isIn(['Residential', 'Business', 'Billing', 'Shipping']),
    body("isPrimary").optional().isBoolean()
]);
procurementCenterRoutes.get("/ho-list",verifyJwtToken, getHoProcurementCenter);

module.exports = { procurementCenterRoutes }; 
