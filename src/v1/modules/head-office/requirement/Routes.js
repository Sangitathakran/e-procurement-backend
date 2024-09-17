const express = require("express");
const requireMentRoutes = express.Router();

const {requireMentList,orderListByRequestId } = require("./Controller");

requireMentRoutes.get('/requirement-list',requireMentList);
requireMentRoutes.get('/order-list/:id',orderListByRequestId)

module.exports = { requireMentRoutes };
