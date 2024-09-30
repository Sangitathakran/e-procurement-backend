const express = require("express");
const requireMentRoutes = express.Router();

const {requireMentList,batchListByRequestId, qcDetailsById } = require("./Controller");
const {verifyJwtToken}=require('../../../middlewares/jwt');
requireMentRoutes.get('/requirement-list',verifyJwtToken,requireMentList);
requireMentRoutes.get('/batch-list/:id',verifyJwtToken,batchListByRequestId)
requireMentRoutes.get('/qcDetail/:id',verifyJwtToken,qcDetailsById)
module.exports = { requireMentRoutes };
