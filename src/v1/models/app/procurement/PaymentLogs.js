const mongoose = require('mongoose');
const { _collectionName, _batchStatus } = require('@src/v1/utils/constants');

const paymentLogsSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: false },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    batch_id:  { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: false },
    procurementExp: { type: Number, trim: true },
    driage: { type: Number, trim: true },
    storageExp: { type: Number, trim: true },
    total: { type: Number, trim: true },
    notes: { type: String, trim: true },   
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
     
}, { timestamps: true });

const PaymentLogs = mongoose.model(_collectionName.PaymentLog, paymentLogsSchema);

module.exports = { PaymentLogs };

