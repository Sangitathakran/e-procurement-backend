const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { Payment } = require('../procurement/Payment');
const {Batch}=require('../procurement/Batch')

const FarmerPaymentFileSchema = new mongoose.Schema({

    fileName: { type: String, required: true }, 
    file_status:{type:String,enum:['upload','download','pending'],default:'pending'},
    initiatedBy : { type: String },
    initiatedAt : { type: Date },

    send_file_details: [{ 

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
        payment_id:{type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Payment,default:null},
        batch_id:{type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch,default:null},
    }],

    received_file_details: [{ 

        CORPORATION_CODE: { type: String },
        CLIENT_CODE: { type: String },
        ACCOUNT_NMBR: { type: String },
        BENEF_ACCOUNT_NMBR: { type: String },
        BENEF_BRANCH_CODE:{ type: String },
        BENEF_DESCRIPTION: { type: String },
        INSTRUMENT_AMNT: { type: String },
        PIR_DATE: { type: String },
        BENE_IFSC_CODE: { type: String },
        PIR_REFERENCE_NMBR: { type: String },
        LIQ_STATUS: { type: String },
        ADDR_5: { type: String },
        UTR_SR_NO: { type: String },
        INST_DATE: { type: String },
        PRODUCT_CODE: { type: String },
        PAYMENT_REF: { type: String }
    }],




}, { timestamps: true });

FarmerPaymentFileSchema.post('save', async function (doc) {
    
    
    try {
    
        const batchIds = doc.send_file_details.map(item => item.batch_id)

        for(const batchId of batchIds) {

            const farmerPaymentCount = await this.constructor.countDocuments({
                "received_file_details.ADDR_5": 'Paid',
                // "send_file_details.batch_id": batchId
            });

            const paymentCount = await Payment.countDocuments({ batch_id: batchId });

            // Calculate final count
            const finalCount = Math.max(Number(paymentCount) - Number(farmerPaymentCount), 0);

            if (finalCount === 0) {
                await Batch.findByIdAndUpdate(batchId, { status: 'Payment Complete' });
                console.log(`Batch ${batchId} status updated to Payment Completed`);
            }
        }

    } catch (error) {
        console.error('Error in post-save middleware:', error);
    }
});

    
const FarmerPaymentFile = mongoose.model(_collectionName.FarmerPaymentFile, FarmerPaymentFileSchema);

module.exports = { FarmerPaymentFile } 