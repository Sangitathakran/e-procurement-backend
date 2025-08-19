const mongoose = require('mongoose');
 const { _collectionName, _status } = require('@src/v1/utils/constants/index');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const citySchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  city_title: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: Object.values(_status),
    default: _status.active,
  },
  ..._commonKeys
}, { timestamps: true });

const districtSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  district_title: { type: String, required: true, trim: true },
  cities: [citySchema],
  status: {
    type: String,
    enum: Object.values(_status),
    default: _status.active,
  },
  serialNumber: { type: String },
  pincode: [{ type: String }],
  ..._commonKeys
}, { timestamps: true });

const stateSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  state_title: { type: String, required: true, trim: true },
  state_code: { type: String, required: true, trim: true },
  districts: [districtSchema],
  status: {
    type: String,
    enum: Object.values(_status),
    default: _status.active,
  },
  ..._commonKeys
}, { timestamps: true });

const State = mongoose.model(_collectionName.states, stateSchema);
module.exports = { State };
