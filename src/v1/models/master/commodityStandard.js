const { _collectionName, _status } = require("@src/v1/utils/constants");

const mongoose = require("mongoose");

const commodityStandardSchema = new mongoose.Schema(
  {
    Id: { type: String, unique: true },
    standardId: { type: String, unique: true },
    name: { type: String, required: true },
    subName: { type: String, required: true  },
    status: { type: String, enum: Object.values(_status), default: _status.active },
  },
  { timestamps: true }
);
const commodityStandard = mongoose.model(
  _collectionName.commodityStandard,
  commodityStandardSchema
);

module.exports = { commodityStandard };
