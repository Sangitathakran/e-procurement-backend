const express = require('express');
const { scheme, commodity, getStates} = require('./Controller');

const dropDownRoutes = express.Router();

dropDownRoutes.get('/scheme', scheme);
dropDownRoutes.get('/commodity', commodity);
dropDownRoutes.get('/state', getStates);





module.exports = { dropDownRoutes};
