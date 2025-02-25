const mongoose = require('mongoose');
const { _collectionName, _paymentmethod, _paymentstatus, _whr_status, _userType, _paymentApproval } = require('@src/v1/utils/constants');

const whrSchema = new mongoose.Schema({
    whr_id : { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Whr, required: true },
    batch_date : { type: Date , trim: true},
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

    
}, { timestamps: true });

const WhrDetail = mongoose.model(_collectionName.WhrDetail, whrSchema);

module.exports = { WhrDetail };