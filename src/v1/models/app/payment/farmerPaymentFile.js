const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');

const FarmerPaymentFileSchema = new mongoose.Schema({

    client_code: { type: String , required: true },
    pir_ref_no: { type: String },
    my_product_code: { type: String , required: true},
    amount: { type: String, required: true },
    acc_no: { type: String , required: true },
    ifsc_code: { type: String, required: true },
    account_name: { type: String, required: true },
    account_no: { type: String, required: true },
    payment_ref: { type: String },
    payment_details: { type: String },
    fileName: { type: String }, 
    initiatedBy : { type: String },
    initiatedAt : { type: Date }


}, { timestamps: true });

const FarmerPaymentFile = mongoose.model(_collectionName.FarmerPaymentFile, FarmerPaymentFileSchema);

module.exports = { FarmerPaymentFile } 