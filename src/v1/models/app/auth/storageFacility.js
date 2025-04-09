const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const storageFacilitySchema = new mongoose.Schema({
    distiller_id: { type: mongoose.Schema.Types.ObjectId,required:true, ref: _collectionName.Distiller, },
    storage_address_line1: { type: String,  trim: true },
    storage_address_line2: { type: String,  trim: true },
    storage_state: {type: mongoose.Schema.Types.ObjectId,  ref:_collectionName.StateDistrictCity, trim: true }, 
    storage_district: {type: mongoose.Schema.Types.ObjectId, ref:_collectionName.StateDistrictCity, trim: true }, 
    storage_capacity: {
        value: { type: Number, }, 
        unit: { type: String, enum: ["Square meters"], default:"Square meters"}
    },
    storage_condition: { type: String, enum: ["Cool","Dry"],  trim: true }, 
    product_produced: { type: String,  trim: true }, 
    supply_chain_capabilities: { type: String, trim: true }, 
    ..._commonKeys
}, { timestamps: true });

const StorageFacility = mongoose.model(_collectionName.StorageFacility, storageFacilitySchema);
module.exports = { StorageFacility }
