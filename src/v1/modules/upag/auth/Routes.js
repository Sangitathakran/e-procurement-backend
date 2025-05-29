const express = require('express');
const {  registerUser, loginUser } = require('./Controllers');
const authRouters = express.Router();
 authRouters.post('/login',loginUser)
 authRouters.post('/ragister-user',registerUser)
module.exports = {authRouters}