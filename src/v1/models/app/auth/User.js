const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const { string } = require('joi');
const userSchema = new mongoose.Schema({

    client_id: { type: String, required: true, trim: true, },
    basic_details: {
        associate_details: {
            associate_type: { type: String, enum: Object.values(_trader_type), default: _trader_type.ORGANISATION },
            organization_name: { type: String, trim: true, },
            associate_name: { type: String, trim: true, },
            email: { type: String, trim: true, lowercase: true, },
            phone: { type: String, trim: true, },
            company_logo: { type: String, trim: true, },
        },
        point_of_contact: {
            name: { type: String, trim: true },
            email: { type: String, lowercase: true, trim: true },
            mobile: { type: String, trim: true },
            designation: { type: String, trim: true },
            aadhar_number: { type: String, trim: true },
            aadhar_image: {
                front: { type: String, trim: true },
                back: { type: String, trim: true },
            }
        },
        company_owner_info: {
            name: { type: String, trim: true },
            aadhar_number: { type: String, trim: true },
            aadhar_image: {
                front: { type: String, trim: true },
                back: { type: String, trim: true },
            },
            pan_card: { type: String, trim: true, },
            pan_image: { type: String, trim: true, },
        },
        implementation_agency: { type: String, trim: true, },
        cbbo_name: { type: String, trim: true, },
    },
    address: {
        registered: {
            line1: { type: String, trim: true },
            line2: { type: String, trim: true },
            country: { type: String, trim: true },
            state: { type: String, trim: true },
            district: { type: String, trim: true },
            state_id: { type: mongoose.Types.ObjectId},
            district_id: { type: mongoose.Types.ObjectId},
            taluka: { type: String, trim: true },
            pinCode: { type: String, trim: true },
            village: { type: String, trim: true },
            ar_circle: { type: String, trim: true },
        },
        operational: {
            line1: { type: String, trim: true },
            line2: { type: String, trim: true },
            country: { type: String, trim: true },
            state: { type: String, trim: true },
            district: { type: String, trim: true },
            taluka: { type: String, trim: true },
            pinCode: { type: String, trim: true },
            village: { type: String, trim: true },
        }
    },
    company_details: {
        cin_number: { type: String, trim: true, },
        cin_image: { type: String, trim: true, },
        tan_number: { type: String, trim: true, },
        tan_image: { type: String, trim: true, },
        pan_card: { type: String, trim: true, },
        pan_image: { type: String, trim: true, },
        aadhar_number: { type: String, trim: true, },
        aadhar_certificate: {
            front: { type: String, trim: true },
            back: { type: String, trim: true },
        },
        gst_no: { type: String, trim: true, },
        gst_no_certificate: {
            type: String, trim: true, 
        },
        pacs_reg_date: { type: String, trim: true, },
        registration_number: { type: String, trim: true, },
    },
    authorised: {
        name: { type: String, trim: true, },
        designation: { type: String, trim: true, },
        phone: { type: String, trim: true, },
        email: { type: String, trim: true, },
        aadhar_number: { type: String, trim: true, },
        aadhar_certificate: {
            front: { type: String, trim: true },
            back: { type: String, trim: true },
        },
        pan_card: { type: String, trim: true, },
        pan_image: { type: String, trim: true, },

    },
    bank_details: {
        bank_name: { type: String, trim: true, },
        branch_name: { type: String, trim: true, },
        account_holder_name: { type: String, rim: true, },
        ifsc_code: { type: String, trim: true, },
        account_number: { type: String, trim: true, },
        upload_proof: { type: String, trim: true },
    },
    functional_status: { type: String, default:false },
    location : { type: String, default:false },
    sector : { type: String, default:false },
    user_code: { type: String, unique: true },
    user_type: { type: String, trim: true, enum: Object.values(_userType) },
    is_mobile_verified: { type: String, default: false },
    is_approved: { type: String, enum: Object.values(_userStatus), default: _userStatus.pending },
    is_email_verified: { type: String, default: false },
    is_form_submitted: { type: String, default: false },
    is_welcome_email_send: { type: Boolean, default: false },
    is_sms_send: { type: Boolean, default: false },
    term_condition: { type: String, default: false },
    active: { type: Boolean, default: true },
    ekhridUser: { type: Boolean, default: false },
    ..._commonKeys
}, { timestamps: true });
userSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    const User = mongoose.model(_collectionName.Users, userSchema);
    try {
        // const lastUser = await User.findOne().sort({ createdAt: -1 });
        // let nextUserCode = 'AS00001';
        // if (lastUser && lastUser.user_code) {
        //     const lastCodeNumber = parseInt(lastUser.user_code.slice(2));
        //     nextUserCode = 'AS' + String(lastCodeNumber + 1).padStart(5, '0');
        // }
        
        ////////////////////////////////////
        const lastUser = await User.findOne(
            { user_code: /^AS\d+$/ }, // Ensures only user_codes matching ASxxxxx pattern
            { user_code: 1 }
        ).sort({ user_code: -1 });

        let lastCodeNumber = 1; // Default if no users exist

        if (lastUser?.user_code) {
            const numericPart = parseInt(lastUser.user_code.replace(/\D/g, ""), 10);
            lastCodeNumber = isNaN(numericPart) ? 1 : numericPart + 1;
        }

        // Generate the next user_code in sequence
        const nextUserCode = `AS${String(lastCodeNumber).padStart(5, '0')}`;
        ///////////////////////////////////////////////////////
        this.user_code = nextUserCode;
        next();
    } catch (err) {
        next(err);
    }
});
const User = mongoose.model(_collectionName.Users, userSchema);
module.exports = { User }