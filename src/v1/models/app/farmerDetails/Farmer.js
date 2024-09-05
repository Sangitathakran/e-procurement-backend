const mongoose = require('mongoose');
const { _collectionName, _proofType, _titles, _gender, _religion, _maritalStatus, _status, _category } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const farmerSchema = new mongoose.Schema({
    associate_id: { type: mongoose.Schema.Types.ObjectId,required: true,ref: _collectionName.Users, trim: true, },
    farmer_code: { type: String, trim: true,},
    title: { type: String, enum: Object.values(_titles), default: null, trim: true, },
    name: { type: String, required: true, trim: true, },
    parents: {
        father_name: { type: String, trim: true, },
        mother_name: { type: String, trim: true, }
    },
    dob: { type: Date, trim: true, },
    gender: { type: String,enum: Object.values(_gender), default: null, trim: true, },
    marital_status: { type: String, enum: Object.values(_maritalStatus), default: null, trim: true, },
    religion: { type: String, enum: Object.values(_religion), default: null, trim: true, },
    category: { type: String, enum: Object.values(_category), default: null, trim: true, },
    education: {
        highest_edu: { type: String, trim: true, },
        edu_details: [{ type: String, trim: true, }],
    },
    proof: {
        type: { type: String, enum: Object.values(_proofType), default: null, trim: true, },
        doc: { type: String, trim: true, },
        aadhar_no: { type: String, required: true, trim: true, },
    },
    address: {
        address_line: { type: String, trim: true, },
        country: { type: String, trim: true },
        state_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity' },
        district_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity.districts' },
        block: { type: String, trim: true, },
        village: { type: String, trim: true, },
        pinCode: { type: String, trim: true },
    },
    mobile_no: { type: String, trim: true, },
    email: { type: String, trim: true, },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    ..._commonKeys
}, { timestamps: true, });
const farmer = mongoose.model(_collectionName.farmers, farmerSchema);
module.exports = { farmer, };