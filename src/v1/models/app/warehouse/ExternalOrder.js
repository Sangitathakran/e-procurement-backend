const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');

const externalOrderSchema = new mongoose.Schema({
    commodity: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    external_batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ExternalBatch, required: true },
    warehousedetails_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.WarehouseDetails },
    basic_details: {
        buyer_name: { type: String, trim: true },
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
    external_order_code: { type: String, unique: true },
    // third_party_client :  { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ClientToken },
}, { timestamps: true });

externalOrderSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    try {
        const ExternalOrder = mongoose.model(_collectionName.ExternalOrder);
        const lastOrder = await ExternalOrder.findOne().sort({ createdAt: -1 });

        let nextExternalOrderCode = 'EXTORD00001';
        if (lastOrder && lastOrder.external_order_code) {
            const lastCodeNumber = parseInt(lastOrder.external_order_code.slice(6));
            nextExternalOrderCode = 'EXTORD' + String(lastCodeNumber + 1).padStart(5, '0');
        }

        this.external_order_code = nextExternalOrderCode;
        next();
    } catch (err) {
        next(err);
    }
});

const ExternalOrder = mongoose.model(_collectionName.ExternalOrder, externalOrderSchema);
module.exports = { ExternalOrder };
