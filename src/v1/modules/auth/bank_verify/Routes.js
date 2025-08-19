const express = require("express");
const { verifyBankAccount } = require("./Controller");
const bankAuthRoutes = express.Router();

bankAuthRoutes.post('/verify', verifyBankAccount);


module.exports = { bankAuthRoutes };
