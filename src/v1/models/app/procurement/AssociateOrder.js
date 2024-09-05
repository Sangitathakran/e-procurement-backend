const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');


const associateOrderSchema = new mongoose.Schema({

}, { timestamps: true });

const AssociateOrder = mongoose.model(_collectionName.AssociateOrder, associateOrderSchema);

module.exports = { AssociateOrder };

