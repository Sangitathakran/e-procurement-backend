const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');
const { _collectionName, _sellerQuoteSellerStatus, _sellerQuoteAdminStatus, _quotesStatus, _sellerQuoteStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const traderQuoteSchema = new mongoose.Schema({
    product_request_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProductRequest },
    unique_code: { type: mongoose.Schema.Types.String, ref: _collectionName.ProductRequest },
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    quantity: { type: Number, min: 1, required: true },
    unit_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Unit },
    grade_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Grade },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Category },
    variety_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Variety },
    commodity_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Commodity },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.product },
    product_name: { type: String },
    product_details: { type: String },
    target_price: { type: Number, default: 1 },
    quote_price: { type: Number, default: 0 },
    product_expiry_date: { type: Date },
    seller_quote_expiry_date: { type: Date },
    logistics_cost: { type: Number, default: 0 },
    service_charge: { type: Number, default: 0 },
    total_cost: { type: Number, default: 1 },
    quote_rejected_reason: { type: String, trim: true },
    seller_status: { type: String, enum: Object.values(_sellerQuoteSellerStatus), default: _sellerQuoteSellerStatus.pending, required: true },
    admin_status: { type: String, enum: Object.values(_sellerQuoteAdminStatus), default: _sellerQuoteAdminStatus.pending, required: true },
    quotes_status: { type: String, enum: Object.values(_quotesStatus), default: _quotesStatus.queryrecieved, required: true },
    status: { type: String, enum: Object.values(_sellerQuoteStatus), default: _sellerQuoteStatus.pending, required: true },
    ..._commonKeys
},
    { timestamps: true },
);

const traderQuote = mongoose.model(_collectionName.TraderQuote, traderQuoteSchema);

module.exports = { traderQuote };
