const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const manufacturingUnitSchema = new mongoose.Schema({
    distiller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Distiller, },
    manufacturing_address_line1: { type: String,  trim: true },
    manufacturing_address_line2: { type: String, trim: true },
    manufacturing_state: { type: mongoose.Schema.Types.ObjectId, ref:_collectionName.StateDistrictCity,  trim: true }, 
    manufacturing_district: { type: mongoose.Schema.Types.ObjectId, ref:_collectionName.StateDistrictCity,  trim: true }, 
    production_capacity: {
        value: { type: Number, }, 
        unit: { type: String, enum: ["square meters"], default:"square meters"}
    },
    product_produced: { type: String,  trim: true }, 
    supply_chain_capabilities: { type: String, trim: true }, 
    source_by: { type: String, default: "NCCF" },
    ..._commonKeys
}, { timestamps: true });

const ManufacturingUnit = mongoose.model(_collectionName.ManufacturingUnit, manufacturingUnitSchema);
module.exports = { ManufacturingUnit }