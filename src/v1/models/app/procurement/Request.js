const mongoose = require('mongoose');
const { _collectionName, _requestStatus } = require('@src/v1/utils/constants');

const RequestSchema = new mongoose.Schema({
    head_office_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.HeadOffice },
    associatOrder_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch }],
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch, required: true },
    reqNo: { type: String, required: true },
    quoteExpiry: { type: Date, required: true, },
    status: { type: String, enum: Object.values(_requestStatus), default: _requestStatus.open },
    quotedPrice: { type: Number, required: true, },
    deliveryDate: { type: Date, required: true, },
    fulfilledQty: { type: Number, default: 0 },
    product: {
        name: { type: String, required: true },
        category: { type: String, required: true },
        grade: { type: String, required: true },
        variety: { type: String, required: true },
        quantity: { type: Number, required: true },
    },
    address: {
        deliveryLocation: { type: String, required: true, },
        lat: { type: String, required: true },
        long: { type: String, required: true },
    },
    comments: [{ user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true }, comment: { type: String, trim: true } }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

const Request = mongoose.model(_collectionName.Request, RequestSchema);

module.exports = { Request };