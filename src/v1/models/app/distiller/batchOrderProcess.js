const mongoose = require('mongoose');
const { _collectionName, _poPickupStatus, _poBatchStatus, _poBatchPaymentStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const batchOrderProcessSchema = new mongoose.Schema({
  distiller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Distiller },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.PurchaseOrder },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Warehouse },
  batchId: { type: String, required: true, immutable: true },
  quantityRequired: { type: Number, required: true },
  scheduledPickupDate: { type: Date },
  pickupStatus: { type: String, enum: Object.values(_poPickupStatus), default: _poPickupStatus.pending },
  status: { type: String, enum: Object.values(_poBatchStatus), default: _poBatchStatus.scheduled },

  payment: {
    paymentId: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(_poBatchPaymentStatus), default: _poBatchPaymentStatus.pending },
    date: { type: Date, default: Date.now }
  },

  penaltyOrder: {
    totalAmount: { type: Number },
    penaltyAmount: { type: Number, min: 0 },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Overdue'] }
  },

  actions: {
    proceedToPay: { type: Boolean, default: false },
    viewOrderSchedule: { type: Boolean, default: false },
    placeOrder: { type: Boolean, default: false },
    viewDeliveryStatus: { type: Boolean, default: false }
  },
  ..._commonKeys
}, { timestamps: true });

const BatchOrderProcess = mongoose.model(_collectionName.BatchOrderProcess, batchOrderProcessSchema);

module.exports = { BatchOrderProcess };