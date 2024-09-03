const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');
const { _collectionName} = require('@src/v1/utils/constants');
const { _collectionName, _status, _areaUnit, _seasons, _seedUsed, _yesNo } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const cropSchema = new mongoose.Schema({
    associate_id: { type: mongoose.Schema.Types.ObjectId,required: true,ref: _collectionName.Users, trim: true, },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, },
    land_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Landsands, required: true, },
    sowing_date: { type: Date, required: true, },
    harvesting_date: { type: Date, required: true, },
    crops_name: { type: String, required: true, trim: true, },
    production_quantity: { type: Number, required: false, },
    area_unit: { type: String, enum: Object.values(_areaUnit), trim: true, },
    total_area: { type: Number, required: false, },
    productivity: { type: Number, required: false, },
    selling_price: { type: Number, required: false, },
    market_price: { type: Number, required: false, },
    yield: { type: String, required: false, },
    seed_used: { type: String, enum: Object.values(_seedUsed), trim: true, },
    fertilizer_used: { type: String, enum: Object.values(_yesNo), trim: true, },
    fertilizer_name: { type: String, trim: true, },
    fertilizer_dose: { type: String, trim: true, },
    pesticide_used: { type: String, enum: Object.values(_yesNo), trim: true, },
    pesticide_name: { type: String, trim: true, },
    pesticide_dose: { type: String, trim: true, },
    insecticide_used: { type: String, enum: Object.values(_yesNo), trim: true, },
    insecticide_name: { type: String, trim: true, },
    insecticide_dose: { type: String, trim: true, },
    crop_insurance: { type: String, enum: Object.values(_yesNo), trim: true, },
    insurance_company: { type: String, trim: true, },
    insurance_worth: { type: Number, },
    crop_seasons: { type: String, enum: Object.values(_seasons), trim: true, },
    status: { type: String, enum: Object.values(_status), default: _status.active, },
    ..._commonKeys,
}, { timestamps: true, });
const Crop = mongoose.model(_collectionName.Crops, cropSchema);
module.exports = { Crop };