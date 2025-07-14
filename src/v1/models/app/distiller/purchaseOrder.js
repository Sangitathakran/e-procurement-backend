const mongoose = require("mongoose");
const {
  _collectionName,
  _poRequestStatus,
  _poAdvancePaymentStatus,
  _poPaymentStatus,
  _penaltypaymentStatus,
} = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");

const purchaseOrderSchema = new mongoose.Schema(
  {
    distiller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.Distiller,
    },
    // warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Warehouse },
    // head_office_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: _collectionName.HeadOffice,
    // },
    branch_id: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.Branch,
      required: true,
    },
    product: {
      name: { type: String, required: true },
      material_code: { type: String },
      grade: { type: String, required: false },
      grade_remark: { type: String, required: false },
      msp: { type: Number, required: true },
      quantityDuration: { type: String, required: false },
    },

    manufacturingLocation: { type: String, required: true },
    storageLocation: { type: String, required: true },
    deliveryLocation: {
      location: { type: String },
      lat: { type: String },
      long: { type: String },
      locationUrl: { type: String },
      locationDetails: { type: Object },
    },
    paymentInfo: {
      totalAmount: { type: Number, required: true }, // Assume this is calculated during the first step
      advancePayment: { type: Number, required: true }, // Auto-calculated: 3% of totalAmount
      advancePaymentStatus: {
        type: String,
        enum: Object.values(_poAdvancePaymentStatus),
        default: _poAdvancePaymentStatus.pending,
      },
      advancePaymentDate: { type: Date },
      advancePaymentUtrNo: { type: String },
      balancePayment: { type: Number, default: 0 }, // Auto-calculated: 97% of totalAmount
      balancePaymentDate: { type: Date },
      paidAmount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      mandiTax: {type: Number, default: 0 },
      penaltyAmount: { type: Number, default: 0 },
      penaltyStaus: {
        type: String,
        enum: Object.values(_penaltypaymentStatus),
        default: _penaltypaymentStatus.NA,
      },
      payment_proof:{ type: String },
    },

    companyDetails: {
      companyName: { type: String, trim: true },
      registeredAddress: { type: String },
      phone: { type: String },  
      faxNo: { type: String },
      email: { type: String },
      pan: { type: String },
      gstin: { type: String },
      cin: { type: String },
    },

    purchasedOrder: {
      poNo: { type: String, required: true, immutable: true },
      poQuantity: { type: Number, default: 0 },
      poAmount: { type: Number, default: 0 },
      poValidity: { type: Date },
    },

    additionalDetails: {
      indentNumber: { type: String },
      indentDate: { type: Date },
      referenceDate: { type: Date },

      contactPerson: {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true },
      },
      transportDetails: {
        modeOfTransport: { type: String, trim: true },
        transporterName: { type: String },
        phone: { type: String },
      },
      termsOfDelivery: {
        supplyFrom: { type: String, trim: true },
        supplyTo: { type: String, trim: true },
        liftingSchedule: { type: String },
        maximumLiftingDistanceFromPlant: { type: Number },
        preferredPacking: { type: String },
        liftingDate: { type: Date },
      },
      digitalSignature: { type: String }, // File path or encoded content
    },

    qualitySpecificationOfProduct: {
      moisture: { type: String },
      broken: { type: String },
    },

    termsAndConditions: {
      accepted: { type: Boolean, default: true },
    },

    poStatus: {
      type: String,
      enum: Object.values(_poRequestStatus),
      default: _poRequestStatus.pending,
    },
    
    payment_status: {
      type: String,
      enum: Object.values(_poPaymentStatus),
      default: _poPaymentStatus.pending,
    },

    status: {
      type: String,
      enum: ["Draft", "Payment Pending", "Completed", "Cancelled"],
      default: "Draft",
    },
    paymentGatewayDetails: {
      transactionId: { type: String },
      paymentStatus: {
        type: String,
        enum: ["Success", "Failure"],
        default: null,
      },
    },
    cancelProcess: {
      isCancelled: { type: Boolean, default: false },
      cancellationReason: {
        type: String,
        required: function () {
          return this.isCancelled;
        },
      },
    },
    fulfilledQty: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    comments: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: _collectionName.Users,
          required: true,
        },
        comment: { type: String, trim: true },
      },
    ],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    ..._commonKeys,
  },
  { timestamps: true }
);

const PurchaseOrderModel = mongoose.model(
  _collectionName.PurchaseOrder,
  purchaseOrderSchema
);

module.exports = { PurchaseOrderModel };

