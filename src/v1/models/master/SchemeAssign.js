const { _collectionName, _status} = require("@src/v1/utils/constants");

const mongoose = require("mongoose");

const SchemeAssignSchema = new mongoose.Schema(
    {
        bo_id: { type: String, required: true },
        scheme_id: { type: String, required: true },
        assignQty: { type: Number },
        status: { type: String, enum: Object.values(_status), default: _status.active },
    },
    { timestamps: true }
);
const SchemeAssign = mongoose.model(
    _collectionName.SchemeAssign,
    SchemeAssignSchema
);

module.exports = { SchemeAssign };