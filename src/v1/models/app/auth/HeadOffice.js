const mongoose = require('mongoose');

const headOfficeSchema = new mongoose.Schema({
   
    office_id: {
        type: String,
        required: true,
        trim: true,
    },
    head_office_name: {
        type: String,
        required: true,
        trim: true,
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
        required: false,
    },
    email_verified:{
        type:Boolean,
        default:false
    },
    address:{
        type: String,
        required: false,
    },
    registered_time: {
        type: Date,
        default: Date.now,
    }
   
    
},
    {
        timestamps: true
    },
);



module.exports = mongoose.model('headOffice', headOfficeSchema);