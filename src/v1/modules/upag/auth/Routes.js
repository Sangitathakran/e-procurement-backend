const express = require('express');
const { generateToken } = require('./Controllers');
const authRouters = express.Router();
 authRouters.get('/',generateToken)
module.exports = {authRouters}