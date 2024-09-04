const mongoose = require('mongoose');
const { _collectionName, _status } = require('@src/v1/utils/constants');
const BankSchema = new mongoose.Schema({
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, },
    associate_id: { type: mongoose.Schema.Types.ObjectId,required: true,ref: _collectionName.Users, trim: true, },
    bank_name: { type: String, required: true, trim: true },
    account_no: { type: String, required: true, trim: true, unique: true },
    conf_account_no: { type: String, required: true, trim: true, },
    ifsc_code: { type: String, required: true, trim: true },
    account_holder_name: { type: String, required: true, trim: true },
    branch_address: {  state: { type: String,  trim: true },
        district: { type: String,trim: true },
        city:{ type : String, required: false } ,
        block: { type: String, trim: false, },
        pinCode: { type: String, trim: true },
     },
    document: {  type : String, required: false},
    status: { type: String, enum: Object.values(_status), default: _status.active, },
    ..._commonKeys,
}, { timestamps: true });
const Bank = mongoose.model(_collectionName.Banks, BankSchema);
module.exports = { Bank };
