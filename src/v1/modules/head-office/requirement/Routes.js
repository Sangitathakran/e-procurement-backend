const express = require("express");
const requireMentRoutes = express.Router();

const {requireMentList,orderListByRequestId } = require("./Controller");
const {verifyJwtToken}=require('../../../middlewares/jwt');
requireMentRoutes.get('/requirement-list',verifyJwtToken,requireMentList);
requireMentRoutes.get('/order-list/:id',verifyJwtToken,orderListByRequestId)

module.exports = { requireMentRoutes };
