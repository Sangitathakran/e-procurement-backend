const mongoose = require('mongoose');
const { _collectionName, _status } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const BankSchema = new mongoose.Schema({
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, },
    bank_name: { type: String, required: true, trim: true },
    branch_name: { type: String, required: true, trim: true },
    account_no: { type: String, required: true, trim: true },
    ifsc_code: { type: String, required: true, trim: true },
    account_holder_name: { type: String, required: true, trim: true },
    branch_address: {  bank_state_id:  { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity' },
        bank_district_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity.districts' },
        city:{ type : String, required: false } ,
        bank_block: { type: String, trim: false, },
        bank_pincode: { type: String, trim: true },
     },
    document: {  type : String, required: false},
    status: { type: String, enum: Object.values(_status), default: _status.active, },
    ..._commonKeys,
}, { timestamps: true });
const Bank = mongoose.model(_collectionName.Banks, BankSchema);
module.exports = { Bank };
