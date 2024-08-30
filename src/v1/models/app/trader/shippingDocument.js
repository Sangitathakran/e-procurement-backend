const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');
const { _collectionName, _status, } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const subSchema = new mongoose.Schema({ 
    imageName : { type : String } , 
    imageKey : { type : String } ,   
})

const shippingDocumentSchema = new mongoose.Schema({
    order_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the order model
        ref: _collectionName.order,
        required: true
    },
    bulk_request_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the bulkrequests model
        ref: _collectionName.bulkRequest,
        required: false
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the user model
        ref: _collectionName.Users,
        required: false,
        trim: true
    },
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the user model
        ref: _collectionName.Users,
        required: true,
        trim: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the product model
        ref: _collectionName.product,
        required: false,
        default: false
    },
    delivery_type: {
        type: String,
        enum: [
            appStatus.delivery_type.DOORSTEP, 
            appStatus.delivery_type.SELFPICKUP
        ],
        default: appStatus.delivery_type.DOORSTEP,
        required: true
    },
    weight_slip: {
        imageName : { 
            type : String 
        }, 
        imageKey : { 
            type : String 
        }
    },
    lab_report: {
        imageName : { 
            type : String 
        }, 
        imageKey : { 
            type : String 
        }
    },
    product_image: { type : [ subSchema ]}, 
    selling_invoice:{
        imageName : { 
            type : String 
        }, 
        imageKey : { 
            type : String 
        }
    },
    grn_file:{
        imageName : { 
            type : String 
        }, 
        imageKey : { 
            type : String 
        }
    },
    pickup_address:{
        type: String,
        required: false,
        trim: true,
    },   
    company_name:{
        type: String,
        required: false,
        trim: true,
    },
    driver_name:{
        type: String,
        required: false,
        trim: true,
    },   
    driver_contact:{
        type: String,
        required: false,
        trim: true,
    },   
    vehicle_number:{
        type: String,
        required: false,
        trim: true,
    },  
    document_status: {
        type: String,
        enum: [
            appStatus.shipping_document_status.MARKREADY,
            appStatus.shipping_document_status.MARKDISPATCH,
            appStatus.shipping_document_status.GRNUPLOAD,
        ],
        default: appStatus.shipping_document_status.MARKREADY,
    },
},
    {
        timestamps: true
    },
);


const shippingDocument = mongoose.model(_collectionName.shippingDocument, shippingDocumentSchema);

module.exports = { shippingDocument };
