const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus } = require('@src/v1/utils/constants');

const PaymentSchema = new mongoose.Schema({
    order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    payment_id: { type: String, required: true },
    transaction_id: { type: String, required: true, },
    amount: { type: Number, required: true },
    payment_date :{ type: Date, default: Date.now,},
    payment_method :{ type: String, enum: Object.values(_paymentmethod) }, 
    payment_status: { type: String, enum: Object.values(_paymentstatus) },
}, { timestamps: true });

const Payment = mongoose.model(_collectionName.Payment, PaymentSchema);

module.exports = { Payment };