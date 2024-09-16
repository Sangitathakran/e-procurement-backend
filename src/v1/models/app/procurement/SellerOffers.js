const { _collectionName, _sellerOfferStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const sellerOffersSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementRequest, required: true },
    offeredQty: { type: Number, required: true, },
    status: { type: String, enum: Object.values(_sellerOfferStatus), default: _sellerOfferStatus.pending, },
    comments: [{ user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true }, comment: { type: String, trim: true } }],
    procuredQty: { type: Number, default: 0 },
    ..._commonKeys
}, { timestamps: true });

const SellerOffers = mongoose.model(_collectionName.SellerOffers, sellerOffersSchema);

module.exports = { SellerOffers };