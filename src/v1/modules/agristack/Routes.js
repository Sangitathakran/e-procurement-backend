const express = require("express");
const { postSeekData, exportAdharHashed } = require("./Controllers");

const agristackchRoutes = express.Router();

agristackchRoutes.post("/agristack/v1/api/central/seekerOnSeek", postSeekData);
//agristackchRoutes.get( '/getStateById', findStateById );
agristackchRoutes.get( '/export-aadhaar-hashes',exportAdharHashed  );

module.exports = { agristackchRoutes };
