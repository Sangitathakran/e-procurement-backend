const mongoose = require('mongoose');
const { _collectionName, _requestStatus } = require('@src/v1/utils/constants');

const purchasedOrderSchema = new mongoose.Schema({
    head_office_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice },
    associatOrder_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers }],
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch, required: true },
    reqNo: { type: String, required: true },
    quoteExpiry: { type: Date, required: true, },
    status: { type: String, enum: Object.values(_requestStatus), default: _requestStatus.open },
    quotedPrice: { type: Number, required: true, },
    deliveryDate: { type: Date, required: true, },
    expectedProcurementDate: { type: Date, required: true, },
    fulfilledQty: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    product: {
        name: { type: String, required: true },
        commodityImage: { type: String, required: true },
        grade: { type: String, required: true },
        quantity: { type: Number, required: true },
    },
    address: {
        deliveryLocation: { type: String, required: false },
        lat: { type: String, required: false },
        long: { type: String, required: false },
        locationUrl: { type: String, required: false }
    },
    comments: [{ user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true }, comment: { type: String, trim: true } }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

const PurchasedOrderModel = mongoose.model(_collectionName.PurchasedOrder, purchasedOrderSchema);

module.exports = { PurchasedOrderModel };