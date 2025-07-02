const express = require('express');
const { scheme, commodity, commodity_standard,commodityRequest, bo_list, cna_list, sla_list, getStates, getRoles, getCitiesByState, getAssociates, getWarehouses, getDistrictsByState, districtWisecenter } = require('./Controller');

const dropDownRoutes = express.Router();

dropDownRoutes.get('/scheme', scheme);
dropDownRoutes.get('/commodity', commodity);
dropDownRoutes.get('/commodity-request', commodityRequest);

dropDownRoutes.get('/commodity_standard', commodity_standard );
dropDownRoutes.get('/bo', bo_list);
dropDownRoutes.get('/cna', cna_list);
dropDownRoutes.get('/sla', sla_list);
dropDownRoutes.get('/state', getStates);
dropDownRoutes.get('/districtsByState', getDistrictsByState);
dropDownRoutes.get('/roles', getRoles);
dropDownRoutes.get('/cities', getCitiesByState);
dropDownRoutes.get('/associates', getAssociates);
dropDownRoutes.get('/warehouses', getWarehouses);
dropDownRoutes.get('/procurementcenter', districtWisecenter);




module.exports = { dropDownRoutes};
