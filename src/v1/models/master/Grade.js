
const mongoose = require("mongoose");
const { _collectionName, _status } = require("@src/v1/utils/constants/index")
const { _commonKeys } = require("@src/v1/utils/helpers/collection")

const gradeSchema = new mongoose.Schema({

    name: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ..._commonKeys,
}, { timestamps: true });


const Grade = mongoose.model(_collectionName.Grade, gradeSchema);

module.exports = { Grade }; 