const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');
const { _collectionName, _status, } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const paymentTransactionSchema = new mongoose.Schema({
    transaction_id:{
        type: String,
        requires:true,
        unique:true
    },
    order_id:{
        type: mongoose.Schema.Types.ObjectId, // Reference to the order model
        ref: _collectionName.order,
        required: true
    },
    order_number:{
        type: String, // Reference to the order model
        ref: _collectionName.order,
        required: true
    },
    payment_term:{
        type: String,
        required: false
    },
    payment_mode:{        
        type: String,
        enum: [
            appStatus.payment_method.ONLINE,
            appStatus.payment_method.BANKTRANSFER,
            appStatus.payment_method.CHEQUE,
            appStatus.payment_method.CASH,
        ],
        default: appStatus.payment_method.ONLINE,
        unique:false
    },
    paid_amount:{
        type: Number,default: 1
    },
    remaining_amount:{
        type: Number,default: 0
    },
    discount:{
        type: Number,default: 0
    },
    reference_id:{
        type: String,
        requires:false,
    },
    payment_docs: { 
        imageName : { 
            type : String 
        }, 
        imageKey : { 
            type : String 
        }
    },
    notes:{
        type: String,
        requires:false,
    },
    order_status: {
        type: String,
        enum: [
            appStatus.order_status.PROVISIONALORDER, 
            appStatus.order_status.ACCEPTEDORDER,
            appStatus.order_status.INTRANSIT,
            appStatus.order_status.DELIVERED,
            appStatus.order_status.COMPLETED,
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
   
},
    {
        timestamps: true
    },
);

const paymentTransaction = mongoose.model(_collectionName.paymentTransaction, paymentTransactionSchema);

module.exports = { paymentTransaction };
