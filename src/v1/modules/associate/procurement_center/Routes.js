const { _middleware } = require("@src/v1/utils/constants/messages");
const { body } = require("express-validator");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { getProcurementCenter, createProcurementCenter, ImportProcurementCenter, generateCenterCode, getHoProcurementCenter, updateProcurementCenter, getProcurementById, statusUpdate 
} = require("@src/v1/modules/associate/procurement_center/Controller");
const express = require("express");
const { verifyAssociate } = require("@src/v1/modules/associate/utils/verifyAssociate");
const procurementCenterRoutes = express.Router();
const { verifyJwtToken } = require("@src/v1/utils/helpers/jwt");
const {commonAuth} = require("@src/v1/middlewares/jwt");

procurementCenterRoutes.get("/ho-list", commonAuth,getHoProcurementCenter);
procurementCenterRoutes.get("/", commonAuth, getProcurementCenter);
procurementCenterRoutes.get("/:id", commonAuth, getProcurementById);

procurementCenterRoutes.post("/import-centers", ImportProcurementCenter);
procurementCenterRoutes.post("/generateCenterCode", generateCenterCode);
procurementCenterRoutes.post("/", validateErrors, verifyAssociate, createProcurementCenter, [
    body("center_name", _middleware.require("center_name")).notEmpty().trim(),
    body("center_code", _middleware.require("center_code")).notEmpty().trim(),
    body("center_mobile", _middleware.require("center_mobile")).notEmpty().trim(),
    body("center_email").optional().trim(),
    body("registration_image").optional().trim(),
    body("pan_number").optional().trim(),
    body("pan_image").optional().trim(),
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
    body("bank_name").optional().trim(),
    body("branch_name").optional().trim(),
    body("account_holder_name").optional().trim(),
    body("ifsc_code").optional().trim(),
    body("account_number").optional().trim(),
    body("proof").optional().trim(),
    body("isPrimary").optional().isBoolean()
]);
procurementCenterRoutes.put("/:id", validateErrors, verifyAssociate, updateProcurementCenter, [
    body("center_name", _middleware.require("center_name")).notEmpty().trim(),
    body("center_code", _middleware.require("center_code")).notEmpty().trim(),
    body("center_mobile", _middleware.require("center_mobile")).notEmpty().trim(),
    body("center_email").optional().trim(),
    body("registration_image").optional().trim(),
    body("pan_number").optional().trim(),
    body("pan_image").optional().trim(),
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
    body("bank_name").optional().trim(),
    body("branch_name").optional().trim(),
    body("account_holder_name").optional().trim(),
    body("ifsc_code").optional().trim(),
    body("account_number").optional().trim(),
    body("proof").optional().trim(),
    body("isPrimary").optional().isBoolean()
]);
procurementCenterRoutes.patch("/status", statusUpdate);

module.exports = { procurementCenterRoutes }; 
