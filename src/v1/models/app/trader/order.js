const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');
const { _collectionName, _status, } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const orderSchema = new mongoose.Schema({
    order_id:{
        type: String,
        requires:true,
        unique:true
    },
    bulk_request_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the bulkrequests model
        ref: _collectionName.bulkRequest,
        required: false
    },
    bulk_request_code: {
        type: mongoose.Schema.Types.String, // Reference to the bulkrequests model
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
    quantity: {
        type: Number,
        min: 1,
        required: true
    },
    unit_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the user model
        ref: _collectionName.Unit,
        required: false,
    },
    commodity_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the user model
        ref: _collectionName.commodity,
        required: false,
        trim: true
    },  
    product_id: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the product model
        ref: _collectionName.product,
        required: false,
    },
    product_name: {
        type: String,
        required: false
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
    buyer_address:{
        type: String,
        required: false
    },
    seller_address:{
        type: String,
        required: false
    },
    seller_quote_id:{
        type: mongoose.Schema.Types.ObjectId, // Reference to the bulkrequests model
        ref: _collectionName.traderQuote,
        required: false
    },
    target_price: {
        type: Number,default: 1
    },
    quote_price: {
        type: Number,default: 1
    },
    logistics_cost: {
        type: Number,default: 0
    },
    service_charge: {
        type: Number,default: 0
    },
    total_cost: {
        type: Number,default: 1
    },
    discount:{
        type: Number,default: 0
    },
    grand_total:{
        type: Number, default: 1
    },
    payment_term:{
        type: String,
        required: false,
        default: false
    },
    order_status: {
        type: String,
        enum: [
            appStatus.order_status.PROVISIONALORDER, 
            appStatus.order_status.ACCEPTEDORDER,
            appStatus.order_status.INTRANSIT,
            appStatus.order_status.DELIVERED,
            appStatus.order_status.COMPLETED,
            appStatus.order_status.CANCELORDER
        ],
        default: appStatus.order_status.PROVISIONALORDER,
        required: false
    },
    payment_status: {
        type: String,
        enum: [
            appStatus.payment_status.INITIALPAYMENTPENDING, 
            appStatus.payment_status.INITIALPAYMENTSUBMITTED,
            appStatus.payment_status.FINALPAYMENTPENDING,
            appStatus.payment_status.FINALPAYMENTSUBMITTED
        ],
        default: appStatus.payment_status.INITIALPAYMENTPENDING,
        required: false
    },
    goods_available: {
      type: Boolean,
      default: false
    },
    grn_available: {
      type: Boolean,
      default: false
    },
    order_progress : { 
     order:{type:Date,required:false },
     provisional_order:{type:Date,required:false },
     accepted_order:{type:Date,required:false },
     picked:{type:Date,required:false },
     delivered:{type:Date,required:false }
    },
    paymentAdminApproved: {
      type: Boolean,
      default: false
    },

},
    {
        timestamps: true
    },
);

const order = mongoose.model(_collectionName.order, orderSchema);

module.exports = { order };
