const { _collectionName, _sellerOfferStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const sellerOffersSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementRequest, required: true },
    offeredQty: { type: Number, required: true, },
    status: { type: String, enum: Object.values(_sellerOfferStatus), default: _sellerOfferStatus.pending, },
    procuredQty: { type: Number, default: 0 },
    ..._commonKeys
}, { timestamps: true });

const sellerOffers = mongoose.model(_collectionName.SellerOffers, sellerOffersSchema);

module.exports = { sellerOffers };