const mongoose = require('mongoose');
const { _collectionName, _poRequestStatus, _poAdvancePaymentStatus, _poPaymentStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const batchOrderProcessSchema = new mongoose.Schema({

  payment: {
    paymentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], required: true },
    date: { type: Date, default: Date.now }
  },
  order: {
    orderId: { type: String, required: true, unique: true },
    commodity: { type: String, required: true },
    quantityRequested: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentSent: { type: Number, required: true },
    poReceipt: { type: String }, // Link to Purchase Order Receipt
    branchOffice: { type: String },
    status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed'], default: 'Scheduled' },
    delivery: {
      deliveryLocation: { type: String, required: true },
      scheduledPickupDate: { type: Date },
      pickupStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
      qcReportLink: { type: String }
    }
  },
  warehouse: {
    warehouseId: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    stockAvailability: { type: Number, required: true },
    timings: { type: String },
    nodalOfficer: { type: String },
    pointsOfContact: [{ name: String, phone: String, email: String }]
  },
  pickupSchedule: {
    warehouseName: { type: String, required: true },
    location: { type: String, required: true },
    quantityOrdered: { type: Number, required: true },
    schedule: { type: String, required: true }, // e.g., "Daily/Weekly"
    pickupStatus: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
  },
  notifications: [
    {
      message: { type: String, required: true },
      date: { type: Date, default: Date.now },
      read: { type: Boolean, default: false }
    }
  ],
  actions: {
    proceedToPay: { type: Boolean, default: false },
    viewOrderSchedule: { type: Boolean, default: false },
    placeOrder: { type: Boolean, default: false },
    viewDeliveryStatus: { type: Boolean, default: false }
  },
  ..._commonKeys
}, { timestamps: true });

const BatchOrderProcess = mongoose.model(_collectionName.batchOrderProcess, batchOrderProcessSchema);

module.exports = { BatchOrderProcess };