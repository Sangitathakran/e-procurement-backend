const mongoose = require('mongoose');

const formerOTPSchema = new mongoose.Schema({ 

    phone: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: false,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
        trim: true,
    },
    isMobileVerified:{
        type:Boolean,
        default:false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: '300s' }  // Automatically expire documents after 5 minute
    },
});

// Create the TTL index on the createdAt field
formerOTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('FormerOTP', formerOTPSchema);

