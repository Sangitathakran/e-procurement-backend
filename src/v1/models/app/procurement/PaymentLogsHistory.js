const mongoose = require('mongoose');
const { _collectionName,  } = require('@src/v1/utils/constants');
const paymentLogSchema = new mongoose.Schema({
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.MasterUser },
    actor: { type: String, required: true },
    action: { type: String, required: true },
    status: { type: String,  default: "Pending" },
    logTime: { type: Date, default: null },
    payment_reintiated: { type: Boolean, default: false },
  });
  
  const PaymentLogsHistory = mongoose.model(_collectionName.PaymentLogsHistory, paymentLogSchema);
  module.exports = PaymentLogsHistory;
  