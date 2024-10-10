const mongoose = require('mongoose');
const { _collectionName, _batchStatus } = require('@src/v1/utils/constants');

const agentPaymentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    bill_slip: {
        inital: [{ img: { type: String, required: true }, on: { type: Date } }],
        received: [{ img: { type: String, required: true }, on: { type: Date } }],
    },
    bills: {
        procurementExp: { type: Number, trim: true },
        driage: { type: Number, trim: true },
        storageExp: { type: Number, trim: true },
        commission: { type: Number, trim: true },
        total: { type: Number, trim: true }
    },
    bill_at: { type: Date },
    approved_at: { type: Date },
    paid_at: { type: Date },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    status: { type: String, enum: Object.values(_batchStatus), default: _batchStatus.pending }
}, { timestamps: true });

const AgentPayment = mongoose.model(_collectionName.AgentPayment, agentPaymentSchema);

module.exports = { AgentPayment };
