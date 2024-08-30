const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');
const { _collectionName, _status, _farmingType, _deliveryType, _requestType, _productRequestStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const productRequestSchema = new mongoose.Schema({
    unique_code: { type: String, required: true, unique: true },
    buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    product: {
        qty: { type: Number, min: 1, required: true },
        unit_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Unit },
        grade_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Grade },
        category_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Category },
        variety_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Variety },
        commodity_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Commodity },
        farming_type: { type: String, enum: Object.values(_farmingType), default: _farmingType.natural },
        price: { type: Number, default: 0 },
    },
    expiry_date: { type: Date, required: true },
    delivery_type: { type: String, enum: Object.values(_deliveryType), default: _deliveryType.doorstep, required: true },
    address_id: { type: mongoose.Schema.Types.ObjectId },
    request_type: { type: String, enum: Object.values(_requestType), default: _requestType.multipleUser },
    status: { type: String, enum: Object.values(_productRequestStatus), default: _productRequestStatus.pending },
    ..._commonKeys
},
    { timestamps: true },
);

const productRequest = mongoose.model(_collectionName.ProductRequest, productRequestSchema);

module.exports = { productRequest };
