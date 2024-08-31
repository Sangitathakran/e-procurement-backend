const mongoose = require('mongoose');

const userLoginHistorySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    browser: { type: String, required: true },
    ip: { type: String, required: true },
    device: { type: String, default: null },
    lat: { type: String, default: null },
    log: { type: String, default: null },
    device_logined: { typeoolean, default: false },
    last_seen_at: { type: Date, trim: true, },
},
    {
        timestamps: true
    },
);

module.exports = mongoose.model('userLoginHistory', userLoginHistorySchema);