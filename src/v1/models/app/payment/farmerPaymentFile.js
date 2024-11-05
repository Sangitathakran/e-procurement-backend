const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { Payment } = require('../procurement/Payment');
const {Batch}=require('../procurement/Batch')

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
       payment_id:{type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Payment,default:null},
       batch_id:{type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch,default:null},
       file_status:{type:String,enum:['upload','download','pending'],default:'pending'},
    initiatedBy : { type: String },
    initiatedAt : { type: Date }


}, { timestamps: true });

FarmerPaymentFileSchema.post('save', async function (doc) {
    
    
    try {
        // Count farmer payments with the same batch ID
        let farmerPaymentCount = await this.constructor.countDocuments({"bank_payment_details.LIQ_STATUS":'Paid' ,batch_id: doc.batch_id });
        console.log('Farmer payment count:', farmerPaymentCount);
        
        // Count total payments with the same batch ID
        let paymentCount = await Payment.countDocuments({ batch_id: doc.batch_id });
        console.log('Payment count:', paymentCount);
        
        // Calculate final count
        let finalCount = Math.max(Number(paymentCount) - Number(farmerPaymentCount), 0);
        
        // If all payments are completed, update the batch status
        if (finalCount === 0) {
            await Batch.findByIdAndUpdate(doc.batch_id, { status: 'Payment Complete' });
            console.log(`Batch ${doc.batch_id} status updated to Payment Completed`);
        }
    } catch (error) {
        console.error('Error in post-save middleware:', error);
    }
});

    
const FarmerPaymentFile = mongoose.model(_collectionName.FarmerPaymentFile, FarmerPaymentFileSchema);

module.exports = { FarmerPaymentFile } 