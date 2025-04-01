const { _collectionName, _procuredStatus, _status } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const farmerOffersSchema = new mongoose.Schema({
    associateOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, required: true },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    metaData: { type: Object, required: true },
    offeredQty: { type: Number, required: true },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ekhrid:{ type: Boolean, default: false },
    ..._commonKeys
}, { timestamps: true });


const FarmerOffers = mongoose.model(_collectionName.FarmerOffers, farmerOffersSchema);

module.exports = { FarmerOffers };