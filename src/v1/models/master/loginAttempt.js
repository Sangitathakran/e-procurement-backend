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
const LoginAttempt = mongoose.model(_collectionName.loginAttempt, loginAttemptSchema);
loginAttemptSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 1800 });
module.exports = { LoginAttempt };
// loginAttemptSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 3600 }); // 1 hour auto cleanup
