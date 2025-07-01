const express = require('express');
const { scheme, commodity, getStates,getCitiesByState,
    getDistrictsByState,getCitiesByDistrict} = require('./Controller');

const dropDownRoutes = express.Router();

dropDownRoutes.get('/scheme', scheme);
dropDownRoutes.get('/commodity', commodity);
dropDownRoutes.get('/state', getStates);
dropDownRoutes.get('/cities', getCitiesByState);
dropDownRoutes.get('/districtsByState', getDistrictsByState);
dropDownRoutes.get('/citiesByDistrict', getCitiesByDistrict);



module.exports = { dropDownRoutes};
