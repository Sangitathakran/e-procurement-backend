const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus } = require('@src/v1/utils/constants');

const PaymentSchema = new mongoose.Schema({
    whomToPay: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    user_type: { type: String, enum: ["farmer", "associate", "agent"], required: true },
    qtyProcured: { type: String, required: true },
    reqNo: { type: String, required: true },
    commodity: { type: String, trim: true },
    payment_id: { type: String, required: false },
    transaction_id: { type: String, required: false, },
    amount: { type: Number, required: true },
    date: { type: Date, },
    method: { type: String, enum: Object.values(_paymentmethod) },
    status: { type: String, enum: Object.values(_paymentstatus), default: _paymentstatus.pending },
}, { timestamps: true });

const Payment = mongoose.model(_collectionName.Payment, PaymentSchema);

module.exports = { Payment };