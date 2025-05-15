const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const agristackLogSchema = new mongoose.Schema({
   correlation_id: { type: String},

    responseData : { type: mongoose.Schema.Types.Mixed},
    ..._commonKeys,
}, { timestamps: true });
const AgristackLog = mongoose.model(_collectionName.agristackLog, agristackLogSchema);
module.exports = { AgristackLog };
