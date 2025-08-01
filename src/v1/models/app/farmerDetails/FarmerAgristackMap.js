const mongoose = require('mongoose');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const FarmerAgristackMapSchema = new mongoose.Schema({
   correlation_id: { type: String},

    farmer_id : { type: mongoose.Schema.Types.ObjectId},
    ..._commonKeys,
}, { timestamps: true });
const FarmerAgristackMap = mongoose.model('FarmerAgristackMaps', FarmerAgristackMapSchema);
module.exports = { FarmerAgristackMap };