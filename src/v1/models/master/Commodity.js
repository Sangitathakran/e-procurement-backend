const mongoose = require("mongoose");
const { _collectionName, _status, _commodityType } = require("@src/v1/utils/constants/index")
const { _commonKeys } = require("@src/v1/utils/helpers/collection")

const commoditySchema = new mongoose.Schema({
  commodityId: { type: String, required: true, immutable: true },
  name: { type: String, required: true, trim: true },
  commodityStandard_id: {type: mongoose.Schema.Types.ObjectId,
        ref: _collectionName.commodityStandard,
        required: true,},
  unit: { type: String },
  status: { type: String, enum: Object.values(_status), default: _status.active },
  ..._commonKeys,
}, { timestamps: true });

const Commodity = mongoose.model(_collectionName.Commodity, commoditySchema);
module.exports = { Commodity }; 