const express = require("express")
const helperRoutes = express.Router()
const { getExcelTemplate, getAddressByPincode, createSeeder , updateDistrictCollection, stateFilter, getCommodity,commodityFilter} = require("./Controller");
const { validateErrors } = require("@src/v1/utils/helpers/express_validator");
const { query } = require("express-validator");
const { _middleware } = require("@src/v1/utils/constants/messages");

helperRoutes.get('/template', [
    query('template_name', _middleware.require("template_name")).notEmpty().trim(),
], validateErrors, getExcelTemplate)
helperRoutes.get('/address', [
    query('pincode', _middleware.require("pincode field must be a 6-digit number")).notEmpty().trim().matches(/^\d{6}$/),
], validateErrors, getAddressByPincode)

helperRoutes.get('/seeder', [
    query('seeder_name', _middleware.require("seeder_name")).notEmpty().trim(),
], validateErrors, createSeeder)

helperRoutes.get("/statefilter" , stateFilter) ; 
helperRoutes.get("/get-commodity" , getCommodity) ; 
helperRoutes.get("/commodityFilter" , commodityFilter) ;

helperRoutes.get('/updateDistrictCollection', updateDistrictCollection)





module.exports = { helperRoutes }

 