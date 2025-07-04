const mongoose = require("mongoose");
const { _collectionName, _commodityType, _userType } = require("@src/v1/utils/constants/index");

const loginHistorySchema = new mongoose.Schema({
  token: { type: String },
  user_type: {
    type: String,
    enum: Object.values(_userType),
    required: true
  },
  master_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.MasterUser,
    required: true
  },
  logged_in_at: {
    type: Date,
    default: Date.now
  },
  logged_out_at: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, { timestamps: true });

const LoginHistory = mongoose.model(_collectionName.LoginHistory, loginHistorySchema);
module.exports = { LoginHistory };
