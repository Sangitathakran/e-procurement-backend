const mongoose = require('mongoose');
const { _collectionName, _status, _areaUnit, _soilType, _distanceUnit, _yesNo } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const landSchema = new mongoose.Schema({
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, },
    total_area: { type: Number, required: false, },
    area_unit: { type: String, enum: Object.values(_areaUnit), default: null, trim: true, },
    khasra_no: { type: String, trim: true, },
    khatauni: { type: String, trim: true, },
    ghat_no: { type: String, trim: true, },
    sow_area: { type: String, trim: true, },
    land_address: {
        country: { type: String, trim:true, default: 'India', },
        state_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity' },
        district_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity.districts' },
        sub_district: { type: String, trim: true, },
    },
    document: { type: String, required: false, },
    expected_production: { type: String, required: false, },
    soil_type: { type: String, enum: Object.values(_soilType), default: null, trim: true, },
    soil_tested: { type: String, enum: Object.values(_yesNo), default: null, trim: true, },
    soil_health_card: { type: String, enum: Object.values(_yesNo), default: null, trim: true, },
    soil_health_card_doc: { type: String, trim: true, },
    soil_testing_lab_name: { type: String, trim: true, },
    lab_distance_unit: { type: String, enum: Object.values(_distanceUnit), default: null, trim: true, },
    status: { type: String, enum: Object.values(_status), default: _status.active, },
    ..._commonKeys,
}, { timestamps: true });
const Land = mongoose.model(_collectionName.Lands, landSchema);
module.exports = { Land };