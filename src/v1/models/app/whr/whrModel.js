const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _whr_status, _userType, _paymentApproval } = require('@src/v1/utils/constants');

const whrSchema = new mongoose.Schema({
    batch_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: true }],
    whr_type:{type:String,required:false},
    state:{type:String,required:false},
    stateAgency:{type:String,required:false},
    district:{type:String,required:false},
    fpoPacks:{type:String,required:false},
    Center:{type:String,required:false},
    year:{type:String,required:false},
    season:{type:String,required:false},
    scheme:{type:String,required:false},
    Commodity:{type:String,required:false},
    warehouse:{type:String,required:false},
    total_dispatch_quantity:{type:String,required:false},
    total_dispatch_bag:{type:String,required:false},
    total_accepted_quantity:{type:String,required:false},
    total_accepted_bag:{type:String,required:false},
    quantity_loss:{type:String,required:false},
    bag_loss:{type:String,required:false},
    quantity_gain:{type:String,required:false},
    bag_gain:{type:String,required:false},
    whr_date:{type:String,required:false},
    whr_number:{type:String,required:false},
    whr_document:{type:String,required:false},
    deleted: { type: Boolean, default: false },
    status: {
        type: String,
        enum: Object.values(_whr_status),
        default: _whr_status.pending,
      },
    
}, { timestamps: true });

const WhrModel = mongoose.model(_collectionName.Whr, whrSchema);

module.exports = { WhrModel };