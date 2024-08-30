const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const contributedFarmersSchema = new mongoose.Schema({
    sellerOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.SellerOffers, required: true },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    metaData: { type: Object, required: true },
    offeredQty: { type: Number, required: true },
    ..._commonKeys
}, { timestamps: true });

const contributedFarmers = mongoose.model(_collectionName.ContributedFarmers, contributedFarmersSchema);

module.exports = { contributedFarmers };