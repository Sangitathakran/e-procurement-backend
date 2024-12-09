const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const storageFacility = new mongoose.Schema({
    distiller_id: { type: mongoose.Schema.Types.ObjectId,required:true, ref: _collectionName.Distiller, },
    address_line1: { type: String,  trim: true },
    address_line2: { type: String,  trim: true },
    state: {type: String,  trim: true }, 
    district: {type: String,  trim: true }, 
    storage_capacity: {
        value: { type: Number, }, 
        unit: { type: String, enum: ['Ltr', 'Kg', 'Ton'], }
    },
    storage_condition: { type: String,  trim: true }, 
    ..._commonKeys
}, { timestamps: true });
const StorageFacility = mongoose.model(_collectionName.StorageFacility, storageFacility);
module.exports = { Distiller,StorageFacility }