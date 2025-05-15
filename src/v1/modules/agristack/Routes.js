const express = require("express");
const { postSeekData } = require("./Controllers");

const agristackchRoutes = express.Router();

agristackchRoutes.post("/on_seek", postSeekData);
//agristackchRoutes.get( '/getStateById', findStateById );

module.exports = { agristackchRoutes };
