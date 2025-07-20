const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _userType, _paymentApproval } = require('@src/v1/utils/constants');

const PaymentSchema = new mongoose.Schema({
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true, index: true  },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, index: true  },
    farmer_order_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    ho_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice, required: true },
    bo_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch, required: true },
    sla_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.SLA },
    sla_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    sla_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    associate_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    sla_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.SLA },
    associateOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, index: true  },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: true },
    qtyProcured: { type: String, required: true },
    amount: { type: Number, required: true },
    initiated_at: { type: Date },
    sla_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    bo_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    bo_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    bo_approve_at: { type: Date, default: null },
    ho_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    // ho_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    ho_approve_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice, default: null },
    ho_approve_at: { type: Date, default: null },
    payment_status: { type: String, enum: Object.values(_paymentstatus), default: _paymentstatus.pending },
    payment_id: { type: String, default: null },
    transaction_id: { type: String, default: null },
    payment_method: { type: String, enum: Object.values(_paymentmethod) },
    ekhrid_payment: { type: Boolean, default: false },
}, { timestamps: true });

const Payment = mongoose.model(_collectionName.Payment, PaymentSchema);

module.exports = { Payment };