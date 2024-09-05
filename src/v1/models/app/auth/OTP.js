const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({ 
    phone: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
        trim: true,
    },
    term_condition: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: '300s' }  // Automatically expire documents after 5 minute
    },
});

module.exports = mongoose.model('OTP', otpSchema);

