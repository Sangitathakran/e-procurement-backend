const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _user_status } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const userSchema = new mongoose.Schema({
    
    client_id: {type: String,required: true,trim: true,},
    basic_details: {
        associate_details: {
            associate_type: {type: String,enum: Object.values(_trader_type), default:_trader_type.ORGANISATION},
            organization_name: {type: String,trim: true,},
            associate_name: {type: String,trim: true,},
            email: {type: String,trim: true,lowercase: true,},
            phone: {type: String,trim: true,},
        },
        point_of_contact: {
            name: { type: String,  trim: true },
            email: { type: String, lowercase: true, trim: true },
            mobile: { type: String,  trim: true },
            designation: { type: String, trim: true },
            aadhar_number: { type: String, trim: true },
            aadhar_image: {
                front: { type: String, trim: true },
                back: { type: String, trim: true },
            }
        },
    },
    address : {
        registered:{
            line1: { type: String,trim: true },
            line2: { type: String,trim: true },
            country: { type: String, trim: true },
            state: { type: String,  trim: true },
            district: { type: String,trim: true },
            taluka: { type: String, trim: true },
            pinCode: { type: String, trim: true },
            village: { type: String, trim: true},
        },
        operational:{
            line1: { type: String,trim: true },
            line2: { type: String,trim: true },
            country: { type: String, trim: true },
            state: { type: String,  trim: true },
            district: { type: String,trim: true },
            taluka: { type: String, trim: true },
            pinCode: { type: String, trim: true },
            village: { type: String, trim: true},
        }
    },
    company_details:{
        cin_number: {type: String, trim: true,},
        cin_image: {type: String, trim: true,},
        tan_number: {type: String, trim: true,},
        tan_image: {type: String, trim: true,},
        pan_card: {type: String, trim: true,},
        pan_image: { type: String, trim: true,},
        aadhar_number: {type: String, trim: true,},
        aadhar_certificate: {
            front: { type: String, trim: true },
            back: { type: String, trim: true },
        }
    },
    authorised:{
        name: {type: String, trim: true,},
        designation: {type: String, trim: true,},
        phone: {type: String, trim: true,},
        email: {type: String, trim: true,},
        aadhar_number: {type: String, trim: true,},
        aadhar_certificate: {
            front: { type: String, trim: true },
            back: { type: String, trim: true },
        },
        pan_card: {type: String, trim: true,},
        pan_image: { type: String, trim: true,},
        
    },
    bank_details:{
        bank_name: {type: String, trim: true,},
        branch_name: {type: String, trim: true,},
        account_holder_name: {type: String, rim: true,},
        ifsc_code: {type: String, trim: true,},
        account_number: {type: String,trim: true,},
        upload_proof: { type: String, trim: true },
    },
    user_status: { type: String, enum: Object.values(_user_status), default:_user_status.APPROVED },
    user_type: {type: String,trim: true ,},
    is_mobile_verified:{type: String,default: false},
    is_email_verified:{type: String,default: false},
    term_condition:{type: String,default: false},
    active: {type: Boolean,default: true},
    ..._commonKeys
},{ timestamps: true });

const User = mongoose.model(_collectionName.Users, userSchema);

module.exports = { User }