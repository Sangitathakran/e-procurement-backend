const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _paymentApproval } = require('@src/v1/utils/constants');
const {AgentInvoice}=require('../payment/agentInvoice')
const AgentPaymentFileSchema = new mongoose.Schema({
    
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

    received_file_details:{

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
      ADDR_5:{ type: String },
      UTR_SR_NO: { type: String },
      INST_DATE: { type: String },
      PRODUCT_CODE: { type: String },
      PAYMENT_REF:{ type: String}
    },

    fileName: { type: String }, 
    agent_invoice_id:{type:String},
    file_status:{type:String,enum:['upload','download','pending'],default:'pending'},
    initiatedBy : { type: String },
    initiatedAt : { type: Date }


}, { timestamps: true });

AgentPaymentFileSchema.post('save', async function (doc) {
    
    
  try {
      
          if(doc.received_file_details?.LIQ_STATUS==='Paid' || doc.received_file_details?.ADDR_5==='Paid'){
            await AgentInvoice.findByIdAndUpdate({_id: doc.agent_invoice_id}, {
              payment_status: 'Completed',
              payment_id:doc.received_file_details.UTR_SR_NO ,
              initiatedAt:doc.received_file_details.INST_DATE
            });
          }

          if(doc.received_file_details?.LIQ_STATUS==='Failed' || doc.received_file_details?.ADDR_5==='Failed'){ 
            await AgentInvoice.findByIdAndUpdate({_id: doc.agent_invoice_id}, {
              payment_status: 'Failed',
              payment_id:doc.received_file_details.UTR_SR_NO ,
              initiatedAt:doc.received_file_details.INST_DATE
            });
          }
          
      
  } catch (error) {
      console.error('Error in post-save middleware:', error);
  }
});

const AgentPaymentFile = mongoose.model(_collectionName.AgentPaymentFile, AgentPaymentFileSchema);

module.exports = { AgentPaymentFile };