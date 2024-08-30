const mongoose = require('mongoose');

const userLoginHistorySchema = new mongoose.Schema({
    userId:{ 
        type: mongoose.Schema.Types.ObjectId , 
        ref: "User"
    },
    browser : { 
        type: String, 
        required: true
    },
    ipAddress: { 
        type: String, 
        required: true
    },
    device : { 
        type: String,
        default: null
    },
    latitude: { 
        type: String,
        default: null
    },
    longitude: { 
        type: String,
        default: null
    },
    isDeviceLogin:{
        type:Boolean,
        default:false
    },
    last_seen_at: {
        type: Date,
        trim: true,
    },
    
},
    {
        timestamps: true
    },
);

module.exports = mongoose.model('userLoginHistory', userLoginHistorySchema);