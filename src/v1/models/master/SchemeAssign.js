const { _collectionName, _status } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection")
const mongoose = require("mongoose");

const SchemeAssignSchema = new mongoose.Schema(
    {
        bo_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: _collectionName.Branch
        },
        ho_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: _collectionName.HeadOffice
        },
        sla_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: _collectionName.SLA
        },
        scheme_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: _collectionName.Scheme,
            required: true,
        },
        assignQty: { type: Number, default: 0 },
        status: { type: String, enum: Object.values(_status), default: _status.active },
        ..._commonKeys,
    },
    { timestamps: true }
);
const SchemeAssign = mongoose.model(
    _collectionName.SchemeAssign,
    SchemeAssignSchema
);

module.exports = { SchemeAssign };