const express = require('express');
const reportsRoutes = express.Router();
const { Auth } = require('@src/v1/middlewares/jwt');
const { Reports } = require('./Controller');
reportsRoutes.post('/get-report', Auth, Reports);
module.exports = { reportsRoutes };