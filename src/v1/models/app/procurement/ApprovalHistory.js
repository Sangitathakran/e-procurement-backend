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
    approvedBy: { type: mongoose.Schema.Types.ObjectId }, // or HeadOffice/Branch/SLA
    approvedAt: { type: Date, default: Date.now },
    remarks: { type: String, default: null },
    ..._commonKeys,
}, { timestamps: true });

const ApprovalLog = mongoose.model(_collectionName.ApprovalLog, approvalLogSchema);

module.exports = { ApprovalLog };