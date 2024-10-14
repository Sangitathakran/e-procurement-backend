const mongoose = require('mongoose');
const { _collectionName, _status, _areaUnit, _soilType, _distanceUnit, _yesNo } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const landSchema = new mongoose.Schema({ 
    area: { type: Number, required: true },
    land_name: { type: String, required: true },
    cultivation_area: { 
        type: Number, 
        // validate: {
        //     validator: function(value) {
        //         return value <= this.land_details.totalArea;
        //     },
        //     message: 'Cultivation area must not exceed total land area'
        // }, 
        required: true 
    },
    area_unit: { 
        type: String, 
        enum: Object.values(_areaUnit).slice(0, 2), 
        required: true 
    },
    state: { type: String, required: true },
    district: { type: String, required: true },
    village: { type: String, required: true },
    block: { type: String, required: true },
    khtauni_number: { type: String },
    khasra_number: { type: String },
    khata_number: { type: String },
    soil_type: { 
        type: String, 
        enum: Object.values(_soilType), 
        required: true 
    },
    soil_tested: { type: Boolean, required: true },
    uploadSoil_health_card: { type: String }, // if soilTested is true
    opt_for_soil_testing: { type: Boolean, required: true },
    soil_testing_agencies: { type: [String] },
    upload_geotag: { type: String, required: false } // file upload URL/path
}, { timestamps: true });
const Land = mongoose.model(_collectionName.Lands, landSchema);
module.exports = { Land };