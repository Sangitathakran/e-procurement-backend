const mongoose = require('mongoose');
const { _collectionName, _approvalLevel, _approvalEntityType, _paymentApproval } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const approvalLogSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: Object.values(_approvalEntityType),
        default: _approvalEntityType.Batch
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    req_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.Request
    },
    level: {
        type: String,
        enum: Object.values(_approvalLevel),
        default: _approvalLevel.SLA
    },
    action: {
        type: String,
        enum: Object.values(_paymentApproval),
        default: _paymentApproval.pending
    },
    sla_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.SLA
    },
    sla_approval: {
        type: String,
        enum: Object.values(_paymentApproval),
        default: _paymentApproval.pending
    },
    sla_approval_at:{
        type: Date,
        default: Date.now
    },
    ho_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.HeadOffice
    },
    ho_approval: {
        type: String,
        enum: Object.values(_paymentApproval),
        default: _paymentApproval.pending
    },
    ho_approval_at:{
        type: Date,
        default: Date.now
    },
    bo_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.BranchOffice
    },
    bo_approval: {
        type: String,
        enum: Object.values(_paymentApproval),
        default: _paymentApproval.pending
    },
    bo_approval_at:{
        type: Date,
        default: Date.now
    },
    Status: {
        type: String,
        enum: Object.values(_paymentApproval),
        default: _paymentApproval.pending
    }, 
    remarks: { type: String, default: null },
    ..._commonKeys,
}, { timestamps: true });

const ApprovalLog = mongoose.model(_collectionName.ApprovalLog, approvalLogSchema);

module.exports = { ApprovalLog };