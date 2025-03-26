const { _collectionName } = require("@src/v1/utils/constants");
const mongoose = require("mongoose");

// Procurement Details Schema
const ProcurementDetailsSchema = new mongoose.Schema({
  agencyName: { type: String }, // Warehouse name
  commodityName: { type: String },
  mandiName: { type: String },
  gatePassWeightQtl: { type: Number },
  farmerID: { type: String },
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
  mspRateMT: { type: Number },
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

// Warehouse Data Schema
const WarehouseDataSchema = new mongoose.Schema({
  jformID: { type: Number }, // Must match with jFormID in procurementDetails
  exitGatePassId: { type: Number },
  destinationAddress: { type: String },
  warehouseName: { type: String },
  warehouseId: { type: String },
  inwardDate: { type: String },
  truckNo: { type: String },
  driverName: { type: String },
  transporterName: { type: String },
});

// Main e-Kharid Schema
const EKhairidSchema = new mongoose.Schema({
  session: { type: String },
  procurementDetails: { type: ProcurementDetailsSchema },
  paymentDetails: { type: PaymentDetailsSchema },
  warehouseData: { type: WarehouseDataSchema },
});

const eKharidHaryanaProcurementModel = mongoose.model(
  _collectionName.eKharidHaryana,
  EKhairidSchema
);

module.exports = { eKharidHaryanaProcurementModel };
