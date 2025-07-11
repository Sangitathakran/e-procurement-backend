const { _collectionName } = require("@src/v1/utils/constants");
const mongoose = require("mongoose");

// Procurement Details Schema
const ProcurementDetailsSchema = new mongoose.Schema({
  agencyName: { type: String }, // Warehouse name
  commodityName: { type: String },
  mandiName: { type: String },
  gatePassWeightQtl: { type: Number },
  farmerID: { type: Number },
  gatePassID: { type: Number },
  gatePassDate: { type: String },
  auctionID: { type: Number },
  auctionDate: { type: String },
  commisionAgentName: { type: String }, // Aartiya name
  jformID: { type: Number, unique: true }, // Unique JForm ID
  jformDate: { type: String },
  JformFinalWeightQtl: { type: Number },
  totalBags: { type: Number },
  liftedDate: { type: String },
  destinationWarehouseName: { type: String },
  receivedAtDestinationDate: { type: String },
  jformApprovalDate: { type: String },
  offerCreatedAt: {  type: Date },
  batchCreatedAt: {  type: Date },
  centerCreatedAt: {  type: Date },
});

// Payment Details Schema
const PaymentDetailsSchema = new mongoose.Schema({
  jFormId: { type: Number },
  transactionId: { type: String },
  transactionAmount: { type: Number },
  transactionDate: { type: String },
  transactionStatus: { type: String },
  reason: { type: String }, // In case of failure
});

// Main e-Kharid Schema
const EKhairidSchema = new mongoose.Schema({
  session: { type: String },
  procurementDetails: { type: ProcurementDetailsSchema },
  paymentDetails: { type: PaymentDetailsSchema },
});

const eKharidHaryanaProcurementModel = mongoose.model(
  _collectionName.eKharidHaryana,
  EKhairidSchema
);

module.exports = { eKharidHaryanaProcurementModel };
