const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: false,
        trim: true,
    },
    last_name: {
        type: String,
        required: false,
        trim: true,
    },
    business_name: {
        type: String,
        required: true,
        trim: true,
    },
    client_id: {
        type: String,
        required: true,
        trim: true,
    },
    trader_type: {
        type: String,
        enum: [
            appStatus.traderType.FPO, 
            appStatus.traderType.NON_PROFIT,
            appStatus.traderType.PRIVATE_COMPANY, 
            appStatus.traderType.INDIVIDUAL,
        ],
        default: appStatus.traderType.INDIVIDUAL,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    username: {
        type: String,
        required: false,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    employee_code: {
        type: String,
        required: false,
        default: 'EMP001',
    },
    phone: {
        type: String,
        trim: true,
    },
    
    email_verified_at: {
        type: String,
        trim: true,
        required: false,
    },
    user_status: {
        type: String,
        enum: [
            appStatus.userStatus.APPROVED, 
            appStatus.userStatus.DISAPPROVED,
            appStatus.userStatus.PENDING, 
            appStatus.userStatus.BANNED,
        ],
        default: appStatus.userStatus.PENDING,
    },
    user_type: {
        type: String,
        trim: true,
        required: false,
    },
    designation: {
        type: String,
        trim: true,
    },
    profile_photo_path: {
        type: String,
        trim: true,
        required: false,
    },
    user_role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserRole',
        required: true,
    },
    
    accept_term_condition: {
        type: Boolean,
        required: false,
    },
    e_mandi_verified: {
        type: Boolean,
        default: false
    },
    onboarding_profle_status: {
        company_details: {
            type: Boolean,
            default: false
        },
        operator_details: {
            type: Boolean,
            default: false
        },
        trade_details: {
            type: Boolean,
            default: false
        },
        bank_details: {
            type: Boolean,
            default: false
        },
    },
    
    last_seen_at: {
        type: Date,
        trim: true,
    },
    isMobileVerified:{
        type:Boolean,
        default:false
    },
    active: {
        type: Boolean,
        default: true
    }
    
},
    {
        timestamps: true
    },
);


module.exports = mongoose.model('User', userSchema);