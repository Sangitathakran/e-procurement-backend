const { _collectionName, _status } = require("@src/v1/utils/constants");

const mongoose = require("mongoose");

const StandardSchema = new mongoose.Schema(
  {
    Id: { type: String, unique: true },
    name: { type: String, required: true },
    subName: { type: String, required: true  },
    status: { type: String, enum: Object.values(_status), default: _status.active },
  },
  { timestamps: true }
);
const Standard = mongoose.model(
  _collectionName.Standard,
  StandardSchema
);
module.exports = { Standard };

