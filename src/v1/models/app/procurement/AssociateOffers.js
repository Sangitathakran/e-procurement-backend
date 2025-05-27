const { _collectionName, _associateOfferStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const associateOffersSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    offeredQty: { type: Number, required: true, },
    status: { type: String, enum: Object.values(_associateOfferStatus), default: _associateOfferStatus.pending, },
    comments: [{ user_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true }, comment: { type: String, trim: true } }],
    procuredQty: { type: Number, default: 0 },
    ..._commonKeys
}, { timestamps: true });

const AssociateOffers = mongoose.model(_collectionName.AssociateOffers, associateOffersSchema);

module.exports = { AssociateOffers };
