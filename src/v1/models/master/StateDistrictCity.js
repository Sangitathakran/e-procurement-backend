const mongoose = require("mongoose");
const { _collectionName, _status } = require("../../utils/constants/index");
const { _commonKeys } = require("../../utils/helpers/collection");

const citySchema = new mongoose.Schema({
    city_title: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ..._commonKeys,
}, { timestamps: true });

const districtSchema = new mongoose.Schema({
    district_title: { type: String, required: true, trim: true },
    cities: [citySchema], 
    status: { type: String, enum: Object.values(_status), default: _status.active },
    serialNumber: { type: String },
    pincode: [{ type: String }],
    ..._commonKeys,
}, { timestamps: true });

const stateSchema = new mongoose.Schema({
    state_title: { type: String, required: true, trim: true },
    state_code: { type: String, required: true, trim: true },
    districts: [districtSchema], 
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ..._commonKeys,
}, { timestamps: true });

const StateDistrictCitySchema = new mongoose.Schema({
    states: [stateSchema] 
}, { timestamps: true }); 

const StateDistrictCity = mongoose.model(_collectionName.StateDistrictCity, StateDistrictCitySchema);

module.exports = { StateDistrictCity };
