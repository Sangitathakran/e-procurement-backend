const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const manufacturingUnitSchema = new mongoose.Schema({
    distiller_id: { type: mongoose.Schema.Types.ObjectId,   ref: _collectionName.Distiller, },
    address_line1: { type: String,  trim: true },
    address_line2: { type: String,  trim: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', }, 
    district: { type: mongoose.Schema.Types.ObjectId, ref: 'District', }, 
    production_capacity: {
        value: { type: Number, }, 
        unit: { type: String, enum: ['Ltr', 'Kg', 'Ton'], }
    },
    product_produced: { type: String,  trim: true }, 
    supply_chain_capabilities: { type: String, trim: true }, 
    ..._commonKeys
}, { timestamps: true });
const ManufactureingUnit = mongoose.model(_collectionName.ManufactureingUnit, manufacturingUnitSchema);
module.exports = { Distiller,ManufactureingUnit }