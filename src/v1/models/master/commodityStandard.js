const { _collectionName, _status } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection")
const mongoose = require("mongoose");

const commodityStandardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subName: {
      type: [String], // Array of strings
      required: true,
    },
    status: { type: String, enum: Object.values(_status), default: _status.active },
   ..._commonKeys,
  }, { timestamps: true });

const commodityStandard = mongoose.model(
  _collectionName.commodityStandard,
  commodityStandardSchema
);

module.exports = { commodityStandard };
