const mongoose = require("mongoose");
const { _collectionName, _commodityType, _userType } = require("@src/v1/utils/constants/index");

const loginAttemptSchema = new mongoose.Schema({
    master_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: _collectionName.MasterUser, 
    },
    userType: {
        type: String,
        enum: Object.values(_userType),
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    failedAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: {
        type: Date,
        default: null,
    },
    lastFailedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

const forgetPasswordSchema = new mongoose.Schema({
    token : {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        default:null,
    },
    ip: {
        type: String,
        required: true,
        default: null,
    },
    expireTime: {
        type: Date, 
        default: Date.now,
    },
    isExpired: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});


const LoginAttempt = mongoose.model(_collectionName.loginAttempt, loginAttemptSchema);
loginAttemptSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 1800 });

const ResetLinkHistory = mongoose.model(_collectionName.forgetHistory, forgetPasswordSchema);
forgetPasswordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 }); 

module.exports = { LoginAttempt,ResetLinkHistory };
