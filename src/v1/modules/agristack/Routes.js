const express = require("express");
const { postSeekData } = require("./Controllers");

const agristackchRoutes = express.Router();

agristackchRoutes.post("/agristack/v1/api/central/seekerOnSeek", postSeekData);
//agristackchRoutes.get( '/getStateById', findStateById );

module.exports = { agristackchRoutes };
