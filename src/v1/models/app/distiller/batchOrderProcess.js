const mongoose = require('mongoose');
const { _collectionName, _poPickupStatus, _poBatchStatus, _penaltypaymentStatus, _poBatchPaymentStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const batchOrderProcessSchema = new mongoose.Schema({
  distiller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Distiller },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.PurchaseOrder },
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.WarehouseDetails },
  warehouseOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Warehouse },
  purchaseId: { type: String, required: true, immutable: true },
  quantityRequired: { type: Number, required: true },
  scheduledPickupDate: { type: Date, default: null },
  actualPickupDate: { type: Date, default: null },
  pickupStatus: { type: String, enum: Object.values(_poPickupStatus), default: _poPickupStatus.pending },
  status: { type: String, enum: Object.values(_poBatchStatus), default: _poBatchStatus.pending },
  comment: { type: String },

  payment: {
    paymentId: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(_poBatchPaymentStatus), default: _poBatchPaymentStatus.pending },
    date: { type: Date, default: Date.now },
    paymentProof: { type: String }
  },

  penaltyDetails: {
    penaltyAmount: { type: Number, default: 0 },
    paneltyAddedBy: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    paneltyAddedAT: { type: Date },
    penaltyBalancePayment: { type: Number, default: 0 },
    comment: { type: String, trim: true },
    penaltypaymentStatus: { type: String, enum: Object.values(_penaltypaymentStatus), default: _penaltypaymentStatus.NA }
  },

  actions: {
    proceedToPay: { type: Boolean, default: false },
    viewOrderSchedule: { type: Boolean, default: false },
    placeOrder: { type: Boolean, default: false },
    viewDeliveryStatus: { type: Boolean, default: false }
  },
  source_by: { type: String, default: "NCCF" },
  ..._commonKeys
}, { timestamps: true });

const BatchOrderProcess = mongoose.model(_collectionName.BatchOrderProcess, batchOrderProcessSchema);

module.exports = { BatchOrderProcess };