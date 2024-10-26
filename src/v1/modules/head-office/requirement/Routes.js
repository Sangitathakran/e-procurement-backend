const express = require("express");
const requireMentRoutes = express.Router();

const {requireMentList,batchListByRequestId, qcDetailsById, auditTrail } = require("./Controller");
const {Auth}=require('../../../middlewares/jwt');
requireMentRoutes.get('/requirement-list',Auth,requireMentList);
requireMentRoutes.get('/batch-list/:id',Auth,batchListByRequestId)
requireMentRoutes.get('/qcDetail/:id',Auth,qcDetailsById)
requireMentRoutes.get("/audit-trial", Auth, auditTrail);
module.exports = { requireMentRoutes };
