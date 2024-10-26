const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _paymentApproval } = require('@src/v1/utils/constants');

const AssociateInvoiceSchema = new mongoose.Schema({
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    ho_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice, required: true },
    bo_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch, required: true },
    associate_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: true },
    qtyProcured: { type: String, required: true },
    goodsPrice: { type: Number, required: true },
    initiated_at: { type: Date, default: null },
    bo_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    bo_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    bo_approve_at: { type: Date, default: null },
    ho_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    ho_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    ho_approve_at: { type: Date, default: null },
    payment_status: { type: String, enum: Object.values(_paymentstatus), default: _paymentstatus.pending },
    payment_id: { type: String, default: null },
    transaction_id: { type: String, default: null },
    payment_method: { type: String, default: null, enum: Object.values(_paymentmethod) },
}, { timestamps: true });

const AssociateInvoice = mongoose.model(_collectionName.AssociateInvoice, AssociateInvoiceSchema);

module.exports = { AssociateInvoice };