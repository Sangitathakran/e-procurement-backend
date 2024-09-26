const express = require("express");
const requireMentRoutes = express.Router();

const {requireMentList,orderListByRequestId, qcDetailsById } = require("./Controller");
const {verifyJwtToken}=require('../../../middlewares/jwt');
requireMentRoutes.get('/requirement-list',verifyJwtToken,requireMentList);
requireMentRoutes.get('/order-list/:id',verifyJwtToken,orderListByRequestId)
requireMentRoutes.get('/qcDetail/:id',verifyJwtToken,qcDetailsById)
module.exports = { requireMentRoutes };
