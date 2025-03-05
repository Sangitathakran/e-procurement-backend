const {
  _collectionName,
  _paymentmethod,
  _paymentstatus,
  _ccAvenuePaymentStatus,
} = require("@src/v1/utils/constants");
const mongoose = require("mongoose");

const ccAvenueResponseSchema = new mongoose.Schema(
  {
    order_status: {
      type: String,
      //   enum: Object.values(_ccAvenuePaymentStatus),
      default: _ccAvenuePaymentStatus.UNKNOWN,
    },
    details: { type: Object, required: true },
    order_id: { type: String },
    payment_method: {
      type: String,
      default: null,
      enum: Object.values(_paymentmethod),
    },
    payment_section: { type: String },
  },
  { timestamps: true }
);

const CCAvenueResponse = mongoose.model(
  _collectionName.CCAvenueResponse,
  ccAvenueResponseSchema
);

module.exports = { CCAvenueResponse };
