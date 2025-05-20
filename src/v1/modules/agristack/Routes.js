const express = require("express");
const { postSeekData, getAgristackFarmersData } = require("./Controllers");

const agristackchRoutes = express.Router();

agristackchRoutes.post("/agristack/v1/api/central/seekerOnSeek", postSeekData);
//agristackchRoutes.get( '/getStateById', findStateById );

agristackchRoutes.post("/agristack_farmer_data", getAgristackFarmersData);



module.exports = { agristackchRoutes };
