const express = require('express');
const { saveExternalFarmerData } = require('./controller');

const localFarmersRoutes = express.Router();

localFarmersRoutes.get( '/test', (req, res) => {
    return res.json( { message: "Local farmer route works!"} );
});

localFarmersRoutes.post('/save_external_farmer_data', saveExternalFarmerData);

module.exports = { localFarmersRoutes };


