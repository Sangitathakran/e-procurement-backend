const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { required } = require('joi');

const externalBatchsSchema = new mongoose.Schema({
    warehousedetails_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.WarehouseDetails },
    batchName: { type: String, trim: true,required:true},
    associate_name: { type: String, trim: true, required: true },
    procurementCenter: { type: String, required:true, trim: true },
    inward_quantity: { type: Number, default: 0 },
    outward_quantity: { type: Number, default: 0 },
    remaining_quantity: { type: Number, trim: true },
    received_on: { type: Date, default: Date.now },
    commodity: { type: String, required: true },
    third_party_client :  { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ClientToken },
}, { timestamps: true });


const ExternalBatch = mongoose.model(_collectionName.ExternalBatch, externalBatchsSchema);

module.exports = { ExternalBatch };
