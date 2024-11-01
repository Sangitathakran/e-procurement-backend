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
    bank_payment_details:[{
        CORPORATION_CODE: { type: String },
        CLIENT_CODE: { type: String },
        ACCOUNT_NMBR: { type: String },
        BENEF_ACCOUNT_NMBR: { type: String },
        BENEF_DESCRIPTION: { type: String },
        INSTRUMENT_AMNT: { type: String },
        PIR_DATE: { type: String },
        BENE_IFSC_CODE: { type: String },
        PIR_REFERENCE_NMBR: { type: String },
        LIQ_STATUS: { type: String },
        UTR_SR_NO: { type: String },
        INST_DATE: { type: String },
        PRODUCT_CODE: { type: String }
          }],
       fileName: { type: String }, 
       file_status:{type:String,enum:['upload','download','pending'],default:'pending'},
    initiatedBy : { type: String },
    initiatedAt : { type: Date }


}, { timestamps: true });

const FarmerPaymentFile = mongoose.model(_collectionName.FarmerPaymentFile, FarmerPaymentFileSchema);

module.exports = { FarmerPaymentFile } 