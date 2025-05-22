const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const agristackLogSchema = new mongoose.Schema({
   correlation_id: { type: String},
    farmer_id : { type: mongoose.Schema.Types.ObjectId},
    type:{ type: String},
    payload: { type: mongoose.Schema.Types.Mixed },
    farmerData: { type: mongoose.Schema.Types.Mixed},
    responseData : { type: mongoose.Schema.Types.Mixed},
    ..._commonKeys,
}, { timestamps: true });
const AgristackLog = mongoose.model(_collectionName.agristackLog, agristackLogSchema);
module.exports = { AgristackLog };
