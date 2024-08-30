const mongoose = require('mongoose');
const { _collectionName, _orderDetailStatus, } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/utils/helpers/collection');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Organization, required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementRequest, required: true },
    orderNo: { type: Number, require: true },
    paymentId: { type: String, required: false },
    paymentToken: { type: String, required: false },
    deliveryInstruction: { type: String, required: false },
    sellerInstruction: { type: String, required: false },
    NoDelivery: { type: Number, default: 0 },
    netAmt: { type: mongoose.Schema.Types.Decimal128, required: true, default: 0 },
    agreement: { type: Boolean, required: false, default: false },
    deliverylocation: {
        lat: { type: Number, required: false },
        lng: { type: Number, required: false },
        address: { type: String, required: false },
    },
    status: { type: String, enum: Object.values(_orderDetailStatus) },
    ..._commonKeys
}, { timestamps: true });

const Order = mongoose.model(_collectionName.Order, orderSchema);

module.exports = { Order };