const mongoose = require('mongoose');
const {_collectionName} = require('@src/v1/utils/constants');

const warehouseSchema = new mongoose.Schema({
    warehouseId: {
        type: String,
        required: true,
        trim: true
    },
    warehouseName: {
        type: String,
        required : true,
        trim: true
    },
    ownerName: {
        type: String,
        required : true,
        trim: true 
    },
    authorized_personName: {
        type: String,
        required : true,
        trim: true
    },
    pointOfContact: {
        name: {type: String, required: true},
        email: {type: String, required: true, lowercase: true},
        phone: {type: String, required: true}
    },
    warehouseCapacity: {
        type: Number,
        required: true,
        trim: true
    }
}, { timestamps: true})

module.exports = mongoose.model(_collectionName.Warehouse, warehouseSchema);


