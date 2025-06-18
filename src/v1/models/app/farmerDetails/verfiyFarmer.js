const mongoose = require('mongoose');
const { _collectionName, _proofType, _status } = require('@src/v1/utils/constants');
const { _verfiycationStatus } = require('@src/v1/utils/constants/index');

const VerfiyfarmerSchema = new mongoose.Schema({
  associate_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.Users,
    default: null,
    index: true
  },
  farmer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.farmers,
    default: null,
    index: true
  },

  request_for_aadhaar: { type: Boolean, default: false },
  request_for_bank: { type: Boolean, default: false },

  is_verify_aadhaar: { type: Boolean, default: false },
  is_verify_aadhaar_date: { type: Date, default: null },
  aadhaar_details: { type: Object, default: {} },

  is_verify_bank: { type: Boolean, default: false },
  is_verify_bank_date: { type: Date, default: null },
  bank_details: { type: Object, default: {} },

  status: {
    type: String,
    enum: [_verfiycationStatus.pending, _verfiycationStatus.failed, _verfiycationStatus.succeed,],
    default: _verfiycationStatus.pending
  }
}, { timestamps: true });

const verfiyfarmer = mongoose.model("verfiyfarmer", VerfiyfarmerSchema);
module.exports = { verfiyfarmer };
