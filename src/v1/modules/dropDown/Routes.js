const express = require('express');
const { scheme, commodity, commodity_standard, bo_list, cna_list, sla_list, getStates } = require('./Controller');
const { verifyDistiller } = require('../distiller/utils/verifyDistiller');

const dropDownRoutes = express.Router();

dropDownRoutes.get('/scheme', scheme);
dropDownRoutes.get('/commodity', commodity);
dropDownRoutes.get('/commodity_standard', commodity_standard );
dropDownRoutes.get('/bo', bo_list);
dropDownRoutes.get('/cna', cna_list);
dropDownRoutes.get('/sla', sla_list);
dropDownRoutes.get('/state', getStates);

module.exports = { dropDownRoutes};