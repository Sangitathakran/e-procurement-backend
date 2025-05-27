const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _paymentApproval } = require('@src/v1/utils/constants');

const AssociateInvoiceSchema = new mongoose.Schema({
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    ho_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice, required: true },
    bo_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch, required: true },
    associate_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    associateOffer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: true },
    qtyProcured: { type: Number, required: true },
    goodsPrice: { type: Number, required: true },
    bills: {
        procurementExp: { type: Number, trim: true },
        qc_survey: [{ type: String, trim: true }],
        gunny_bags: [{ type: String, trim: true }],
        weighing_stiching: [{ type: String, trim: true }],
        loading_unloading: [{ type: String, trim: true }],
        transportation: [{ type: String, trim: true }],
        driage: { type: Number, trim: true },
        storageExp: { type: Number, trim: true },
        commission: { type: Number, trim: true },
        total: { type: Number, trim: true },

        // rejection case
        agent_reject_by: { type: mongoose.Schema.Types.ObjectId, default: null },
        agent_reject_at: { type: Date, default: null },
        reason_to_reject: { type: String, default: null }

    },
    payment_change_remarks: { type: String , default: null},
    initiated_at: { type: Date, default: null },
    agent_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    agent_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    agent_approve_at: { type: Date, default: null },
    payment_status: { type: String, enum: Object.values(_paymentstatus), default: _paymentstatus.pending },
    payment_id: { type: String, default: null },
    transaction_id: { type: String, default: null },
    payment_method: { type: String, default: null, enum: Object.values(_paymentmethod) },
    logs: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    }
}, { timestamps: true });

const AssociateInvoice = mongoose.model(_collectionName.AssociateInvoice, AssociateInvoiceSchema);

module.exports = { AssociateInvoice };