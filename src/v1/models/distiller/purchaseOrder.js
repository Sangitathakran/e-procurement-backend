const mongoose = require('mongoose');
const { _collectionName, _poRequestStatus, _poPaymentStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const purchaseOrderSchema = new mongoose.Schema({
  poNo: { type: String, required: true, immutable: true },
  poDate: { type: Date, required: true, default: Date.now, immutable: true },

  distiller_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers }],
  head_office_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice },
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch, required: true },
  product: {
    name: { type: String, required: true },
    grade: { type: String, required: false },
    grade_remark: { type: String, required: false },
    quantity: { type: Number, required: true },
    msp: { type: Number, required: true },
    poQuantity: { type: Number, required: true },
    quantityDuration: { type: String, required: false }
  },
  manufacturingLocation: { type: String, required: true },
  storageLocation: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  tokenAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  deliveryLocation: { type: String, required: true },

  companyDetails: {
    companyName: { type: String, trim: true },
    registeredAddress: { type: String, required: true },
    phone: { type: String, required: true },
    faxNo: { type: String, required: false },
    email: { type: String, required: true },
    pan: { type: String, required: true },
    gstin: { type: String, required: true },
    cin: { type: String, required: true }
  },

  purchasedOrder: {
    poNo: { type: String },
    poDate: { type: Date },
    poQuantity: { type: Number },
    poAmount: { type: Number },
    poValidity: { type: Date }
  },

  paymentInfo: {
    totalAmount: { type: Number, required: true }, // Assume this is calculated during the first step
    advancePayment: { type: Number, required: true }, // Auto-calculated: 3% of totalAmount
    advancePaymentDate: { type: Date },
    advancePaymentUtrNo: { type: String, required: true },
    balancePayment: { type: Number, required: true }, // Auto-calculated: 97% of totalAmount
    balancePaymentDate: { type: Date }
  },

  additionalDetails: {
    indentNumber: { type: String, required: true },
    indentDate: { type: Date, required: true },
    referenceDate: { type: Date, required: true },
    deliveryAddress: { type: String, required: true },
    
    contactPerson: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true }
    },
    transportDetails: {
      modeOfTransport: { type: String, trim: true },
      transporterName: { type: String },
      phone: { type: String }
    },
    termsOfDelivery: {
      supplyFrom: { type: String, trim: true },
      supplyTo: { type: String, trim: true },
      liftingSchedule: { type: String },
      maximumLiftingDistanceFromPlant: { type: Number },
      preferredPacking: { type: String },
      liftingDate: { type: Date, required: true },
    },
    digitalSignature: { type: String, required: true }, // File path or encoded content
  },

  qualitySpecificationOfProduct: {
    moisture: { type: String },
    broken: { type: String }
  },

  termsAndConditions: {
    accepted: { type: Boolean, required: true },
  },
  status: { type: String, enum: Object.values(_poRequestStatus), default: _poRequestStatus.pending },
  payment_status: { type: String, enum: Object.values(_poPaymentStatus), default: _poPaymentStatus.pending },

  status: {
    type: String,
    enum: ['Draft', 'Payment Pending', 'Completed', 'Cancelled'],
    default: 'Draft',
  },
  paymentGatewayDetails: {
    transactionId: { type: String },
    paymentStatus: { type: String, enum: ['Success', 'Failure'], default: null },
  },
  cancelProcess: {
    isCancelled: { type: Boolean, default: false },
    cancellationReason: { type: String, required: function () { return this.isCancelled; } },
  },
  fulfilledQty: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  comments: [{ user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true }, comment: { type: String, trim: true } }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },


  ..._commonKeys
}, { timestamps: true });

const PurchaseOrderModel = mongoose.model(_collectionName.PurchaseOrder, purchaseOrderSchema);

module.exports = { PurchaseOrderModel };