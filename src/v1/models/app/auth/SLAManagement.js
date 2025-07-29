const mongoose = require('mongoose');
const { _collectionName, _status, _userType, _trader_type } = require('@src/v1/utils/constants');
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
        country: { type: String, trim: true, },
    },
    operational_address: {
        line1: { type: String, trim: true, required: true },
        line2: { type: String, trim: true },
        pinCode: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true },
        district: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        country: { type: String, trim: true },
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
        account_holder_name: { type: String, trim: true, required: true },
        ifsc_code: { type: String, trim: true, required: true },
        account_number: { type: String, trim: true, required: true },
        proof: { type: String, trim: true, required: true },
    },
    activity: {
        ..._commonKeys,
    },
    // active: { type: Boolean, default: true },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    associatOrder_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers }],
    schemes: {
        scheme: [{ type: mongoose.Schema.Types.ObjectId, ref: "Scheme" }],//not confirmed yet, need to discuss with ashita
        cna: { type: mongoose.Schema.Types.ObjectId, ref: "HeadOffice" },
        branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }
    },
    slaId: { type: String, unique: true },
    ..._commonKeys,
}, { timestamps: true });

SLASchema.pre('save', async function (next) {
    if (this.isNew && !this.slaId) {
        try {
            const SLAManagement = mongoose.model(_collectionName.SLA, SLASchema);

            const lastSLA = await SLAManagement.findOne().sort({ createdAt: -1 });
            let nextSLAId = 'SLA00001';

            if (lastSLA && lastSLA.slaId) {
                const lastCodeNumber = parseInt(lastSLA.slaId.slice(3), 10); // Extract numeric part
                nextSLAId = 'SLA' + String(lastCodeNumber + 1).padStart(5, '0');
            }

            this.slaId = nextSLAId;
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

module.exports = mongoose.model(_collectionName.SLA, SLASchema)