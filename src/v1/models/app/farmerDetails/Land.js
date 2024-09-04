const mongoose = require('mongoose');
const { _collectionName, _status, _areaUnit, _soilType, _distanceUnit, _yesNo } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const landSchema = new mongoose.Schema({
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, },
    associate_id: { type: mongoose.Schema.Types.ObjectId,required: true,ref: _collectionName.Users, trim: true, },
    total_area: { type: Number, required: false, },
    area_unit: { type: String, enum: Object.values(_areaUnit), trim: true, },
    khasra_no: { type: String, trim: true, },
    khatauni: { type: String, trim: false, },
    sow_area: { type: String, trim: false, },
    land_address: {
        country: { type: String, trim: true },
        state: { type: String,  trim: true },
        district: { type: String,trim: true },
        sub_district: { type: String, trim: false, },
        village: { type: String, trim: false, },
        pinCode: { type: String, trim: true },
    },
    document: { type: String, required: false, },
    expected_production: { type: String, required: false, },
    soil_type: { type: String, enum: Object.values(_soilType), trim: true, },
    soil_tested: { type: String, enum: Object.values(_yesNo), trim: true, },
    soil_health_card: { type: String, enum: Object.values(_yesNo), trim: true, },
    soil_health_card_doc: { type: String, trim: true, },
    soil_testing_lab_name: { type: String, trim: true, },
    lab_distance_unit: { type: String, enum: Object.values(_distanceUnit), trim: true, },
    status: { type: String, enum: Object.values(_status), default: _status.active, },
    ..._commonKeys,
}, { timestamps: true });
const Land = mongoose.model(_collectionName.Lands, landSchema);
module.exports = { Land };