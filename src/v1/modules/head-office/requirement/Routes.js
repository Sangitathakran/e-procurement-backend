const express = require("express");
const requireMentRoutes = express.Router();

const { requireMentList, batchListByRequestId, qcDetailsById, requirementById, auditTrail } = require("./Controller");
const { Auth } = require('../../../middlewares/jwt');
requireMentRoutes.get("/audit-trial", Auth, auditTrail);
requireMentRoutes.get('/requirement-list', Auth, requireMentList);
requireMentRoutes.get('/:requirementId', Auth, requirementById);
requireMentRoutes.get('/batch-list/:id', Auth, batchListByRequestId)
requireMentRoutes.get('/qcDetail/:id', Auth, qcDetailsById)
module.exports = { requireMentRoutes };
