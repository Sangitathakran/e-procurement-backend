const express = require("express");
const requireMentRoutes = express.Router();

const {requireMentList } = require("./Controller");

requireMentRoutes.get('/requirement-list',requireMentList);

module.exports = { requireMentRoutes };
