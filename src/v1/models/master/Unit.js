
const mongoose = require("mongoose");
const { _collectionName, _status } = require("@src/v1/utils/constants")
const { _commonKeys } = require("@src/v1/utils/helpers/collection")

const unitSchema = new mongoose.Schema({

    name: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ..._commonKeys,
}, { timestamps: true });


const Unit = mongoose.model(_collectionName.Unit, unitSchema);


module.exports = { Unit }; 