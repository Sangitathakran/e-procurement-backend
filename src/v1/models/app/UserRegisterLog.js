const mongoose = require('mongoose');
const appStatus = require('../utils/appStatus');

const userRegisterLogSchema = new mongoose.Schema({
    business_name: {
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
            appStatus.traderType.HO,
            appStatus.traderType.BO,
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
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        trim: true,
        required: true,
    },
    
    accept_term_condition: {
        type: Boolean,
        required: true,
    },
    otp_verified:{
        type:Boolean,
        default:false
    },
    entry_time: {
        type: Date,
        default: Date.now,
        index: { expires: '310s' }  // Automatically expire documents after 5 min 10 sec
    }
    
},
    {
        timestamps: true
    },
);

function generateEmployeeCode() {
    return this.model('User').countDocuments().then(count => {
        const codeNumber = count + 1;
        const paddedNumber = codeNumber.toString().padStart(3, '0');
        return `EMP${paddedNumber}`;
    });
}

module.exports = mongoose.model('userRegisterLog', userRegisterLogSchema);