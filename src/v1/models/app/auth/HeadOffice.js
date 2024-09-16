const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _user_status } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

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
    userType:{
            type:String,
            default:"5"
    },
    address:{
        type: String,
        required: false,
    },
    activity:{
        ..._commonKeys
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



module.exports = mongoose.model(_collectionName.HeadOffice, headOfficeSchema);