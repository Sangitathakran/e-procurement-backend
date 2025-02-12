const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const SLASchema = new mongoose.Schema({
    basic_details: {
        name: { type: String, required: true },
        email: { type: String, lowercase: true, trim: true, required: true },
        mobile: { type: String, trim: true, required: true },
        company_logo: { type: String, trim: true }
    },
    company_owner_information: {
        owner_name: { type: String },
        mobile: { type: String, trim: true, required: true },
        email: { type: String, lowercase: true, trim: true, required: true },
        aadhar_number: { type: String, trim: true, required: true },
        aadhar_image: {
            front: { type: String, trim: true },
            back: { type: String, trim: true },
        },
        pan_card: { type: String, trim: true, required: true },
        pan_image: { type: String, trim: true },
    },
    point_of_contact: {
        name: { type: String, trim: true, required: true },
        designation: { type: String, trim: true, required: true },
        mobile: { type: String, trim: true, required: true },
        email: { type: String, lowercase: true, trim: true, required: true },
        aadhar_number: { type: String, trim: true, required: true },
        aadhar_image: {
            front: { type: String, trim: true, required: true },
            back: { type: String, trim: true, required: true },
        },
    },
    address: {
        line1: { type: String, trim: true, required: true },
        line2: { type: String, trim: true },
        pinCode: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true },
        district: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        country: { type: String, trim: true, required: true },
    },
    operational_address: {
        line1: { type: String, trim: true, required: true },
        line2: { type: String, trim: true },
        pinCode: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true },
        district: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        country: { type: String, trim: true, required: true },
    },
    company_details: {
        registration_number: { type: String, trim: true, required: true },
        tan_card: { type: String, trim: true },
        cin_image: { type: String, trim: true, required: true },
        tan_image: { type: String, trim: true },
        pan_card: { type: String, trim: true, required: true },
        pan_image: { type: String, trim: true, required: true },
    },
    authorised: {
        name: { type: String, trim: true, required: true },
        designation: { type: String, trim: true, required: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, required: true },
        aadhar_number: { type: String, trim: true, required: true },
        aadhar_certificate: {
            front: { type: String, trim: true, required: true },
            back: { type: String, trim: true, required: true },
        },
        pan_card: { type: String, trim: true },
        pan_image: { type: String, trim: true },
    },
    bank_details: {
        bank_name: { type: String, trim: true, required: true },
        branch_name: { type: String, trim: true, required: true },
        bank_name: { type: String, trim: true, required: true },
        ifsc_code: { type: String, trim: true, required: true },
        account_number: { type: String, trim: true, required: true },
        proof: { type: String, trim: true, required: true },
    },
    sla_id: { type: String, required: true, immutable: true },
    activity: {
        ..._commonKeys,
    },
    active: { type: Boolean, default: true },
    associatOrder_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers }],
    schemes: [{
        scheme: { type: mongoose.Schema.Types.ObjectId, ref: "Scheme" },
        cna: { type: mongoose.Schema.Types.ObjectId, ref: "HeadOffice" },
        branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }
    }],
}, { timestamps: true });

module.exports = mongoose.model(_collectionName.SLA, SLASchema)