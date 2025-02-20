const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _userType, _paymentApproval } = require('@src/v1/utils/constants');

const whrSchema = new mongoose.Schema({
    batch_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch, required: true }],
    whr_type:{type:String,required:true},
    state:{type:String,required:true},
    stateAgency:{type:String,required:true},
    district:{type:String,required:true},
    fpoPacks:{type:String,required:true},
    Center:{type:String,required:true},
    year:{type:String,required:true},
    season:{type:String,required:true},
    scheme:{type:String,required:true},
    Commodity:{type:String,required:true},
    warehouse:{type:String,required:true},
    total_dispatch_quantity:{type:String,required:true},
    total_dispatch_bag:{type:String,required:true},
    total_accepted_quantity:{type:String,required:true},
    total_accepted_bag:{type:String,required:true},
    quantity_loss:{type:String,required:true},
    bag_loss:{type:String,required:true},
    quantity_gain:{type:String,required:true},
    bag_gain:{type:String,required:true},
    whr_date:{type:String,required:true},
    whr_number:{type:String,required:true},
    whr_document:{type:String,required:true},
    whr_lot_detail : [{
        batch_date : { type: Date },
        batch_id : { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch},
        lot_id : { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.FarmerOrder},
        farmer_name : { type:String, },
        dispatch_quantity : { type: Number, trim: true },
        dispatch_bag : { type: Number, trim: true },
        accepted_quantity: { type: Number, trim: true },
        accepted_bag: { type: Number, trim: true },
        rejected_quantity: { type: Number },
        rejected_bag: { type: Number, trim: true },
        quantity_gain: { type: Number, trim: true },
        bag_gain: { type: Number, trim: true },
    }],
}, { timestamps: true });

const WhrModel = mongoose.model(_collectionName.Whr, whrSchema);

module.exports = { WhrModel };