const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const storageFacilitySchema = new mongoose.Schema({
    distiller_id: { type: mongoose.Schema.Types.ObjectId,required:true, ref: _collectionName.Distiller, },
    storage_address_line1: { type: String,  trim: true },
    storage_address_line2: { type: String,  trim: true },
    storage_state: {type: String,  trim: true }, 
    storage_district: {type: String,  trim: true }, 
    storage_capacity: {
        value: { type: Number, }, 
        unit: { type: String, enum: ['Ltr', 'Kg', 'Ton'], }
    },
    storage_condition: { type: String,  trim: true }, 
    ..._commonKeys
}, { timestamps: true });

const StorageFacility = mongoose.model(_collectionName.StorageFacility, storageFacilitySchema);
module.exports = { StorageFacility }