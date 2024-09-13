const mongoose = require('mongoose');
const { _collectionName, _proofType, _titles, _gender, _religion, _maritalStatus, _status, _category } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const farmerSchema = new mongoose.Schema({
    associate_id: { type: mongoose.Schema.Types.ObjectId,required: true,ref: _collectionName.Users, trim: true, },
    farmer_code: { type: Number, trim: true,},
    title: { type: String, enum: Object.values(_titles), trim: false, },
    name: { type: String, required: true, trim: true, },
    parents: {
        father_name: { type: String, trim: true, },
        mother_name: { type: String, trim: false, }
    },
    dob: { type: Date, trim: false, },
    gender: { type: String,enum: Object.values(_gender), trim: false, },
    marital_status: { type: String, enum: Object.values(_maritalStatus), trim: false, },
    religion: { type: String, enum: Object.values(_religion), trim: false, },
    category: { type: String, enum: Object.values(_category), trim: false, },
    education: {
        highest_edu: { type: String, trim: false, },
        edu_details: [{ type: String, trim: false, }],
    },
    proof: {
        type: { type: String, enum: Object.values(_proofType), trim: false, },
        doc: { type: String, trim: false, },
        aadhar_no: { type: String, required: true, trim: true, },
    },
    address: {
        address_line: { type: String, trim: true, },
        country: { type: String, trim: true },
        state: { type: String,  trim: true },
        district: { type: String,trim: true },
        block: { type: String, trim: false, },
        village: { type: String, trim: false, },
        pinCode: { type: String, trim: true },
    },
    mobile_no: { type: String, trim: true, },
    email: { type: String, trim: false, },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ..._commonKeys
}, { timestamps: true, });
const farmer = mongoose.model(_collectionName.farmers, farmerSchema);
module.exports = { farmer};