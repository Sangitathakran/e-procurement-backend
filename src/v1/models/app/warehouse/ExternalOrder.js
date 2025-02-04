const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const externalOrderSchema = new mongoose.Schema({
    commodity: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    external_batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ExternalBatch, trim: true, required: true },
    basic_details: {
        buyer_name: { type: String, trim: true, },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        cin_number: { type: String, trim: true },
        gst_number: { type: String, trim: true },
    },
    address: {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        state: { type: String, trim: true },
        district: { type: String, trim: true },
        city: { type: String, trim: true },
        tehsil: { type: String, trim: true },
        pinCode: { type: String, trim: true },
    },
}, { timestamps: true });



const ExternalOrder = mongoose.model(_collectionName.ExternalOrder, externalOrderSchema);
module.exports = { ExternalOrder };