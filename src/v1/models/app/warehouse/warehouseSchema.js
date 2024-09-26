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
    state:{
        type:String,
        default:'Uttar Pradesh',
        required:true
    },
    district:{
        type:String,
        required:true
    },
    location:{
        type:String,
        required:true
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

const wareHouse = mongoose.model(_collectionName.DummyWarehouse, warehouseSchema);
module.exports = {wareHouse};

