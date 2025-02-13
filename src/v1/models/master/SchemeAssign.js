const { _collectionName, _status} = require("@src/v1/utils/constants");

const mongoose = require("mongoose");

const SchemeAssignSchema = new mongoose.Schema(
    {
        bo_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: _collectionName.Branch,
                required: true,
              },
        scheme_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: _collectionName.Scheme,
                required: true,
              },
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