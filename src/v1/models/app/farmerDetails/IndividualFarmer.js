const mongoose = require('mongoose');
const { _collectionName, _proofType, _titles, _gender, _religion, _maritalStatus, _status, _category, _farmerType , _areaUnit ,
    _khaifCrops, _rabiCrops, _zaidCrops, _individual_category } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const farmerSchema = new mongoose.Schema({

    mobile_no:{type:String,required:true},
    name:{type:String,default:null},
    isVerifyOtp:{type:Boolean,default:false},
    farmer_id: {type: String, default: null},
    isWelcomeMsgSend: {type: Boolean, default:false},

    user_type: {
        type: String,
        default: "3"
    },
    
    basic_details: { 
        name: { type: String, trim: true, },
        email: { type: String, trim: false, },
        father_husband_name: { type: String, trim: true, },
        mobile_no: { type: String, trim: true, },
        category: { type: String, enum: Object.values(_individual_category), trim: false, },
        dob: { type: String, trim: true},
        farmer_type: { type: String, enum: Object.values(_farmerType), trim: false, },
        gender: { type: String,enum: Object.values(_gender), trim: false, }
    },
    address: {
        address_line_1: { type: String, trim: true, },
        address_line_2: { type: String, trim: true, },
        country: { type: String, trim: true },
        state: { type: String,  trim: true },
        district: { type: String,trim: true },
        block: { type: String, trim: false, }, // it is Taluka in frontend 
        village: { type: String, trim: false, },
        pinCode: { type: String, trim: true },
    },
    land_details: { 
        area: { type: String, trim: true},
        area_unit: { type: String, enum: Object.values(_areaUnit).slice(0, 2)},
        pinCode: { type: String, trim: true },
        state: { type: String,  trim: true },
        district: { type: String,trim: true },
        village: { type: String, trim: true, },
        block: { type: String, trim: true, }, // it is Taluka in frontend
        ghat_number: { type: String, trim: true, },  
        khasra_number: { type: String, trim: true},
        Khasra_doc_key: { type:String, trim: true},
        kharif_crops: [{ type: String, enum: Object.values(_khaifCrops), trim: false, }],
        rabi_crops: [{ type: String, enum: Object.values(_rabiCrops), trim: false, }],
        zaid_crops: [{ type: String, enum: Object.values(_zaidCrops), trim: false, }]


    },  
    documents: { 
        aadhar_number: { type: String, trim: true },
        aadhar_front_doc_key: { type: String, trim: true },
        aadhar_back_doc_key: { type: String, trim: true },
        pan_number: { type: String, trim: true },
        pan_doc_key: { type: String, trim: true },
    },
    bank_details: { 
        bank_name: { type: String, trim: true },
        branch_name: { type: String, trim: true },
        account_holder_name: { type: String, trim: true },
        ifsc_code: { type: String, trim: true },
        account_no: { type: String, trim: true, unique: true },
        proof_doc_key: { type: String ,trim: true }
        
        
    },
    steps: [{ 
        label: {type: String},
        screen_number: {type: String, default: "1"},
        status: {type: String , enum:  ['active', 'pending', 'completed'] , default: "pending"}
    }],
    allStepsCompletedStatus : {type: Boolean, default: false},
    associate_id: { type: mongoose.Schema.Types.ObjectId,required: false,ref: _collectionName.Users,default:null},

    ..._commonKeys,
    


}, { timestamps: true, });
const IndividualFarmer = mongoose.model(_collectionName.individualFarmers, farmerSchema);
module.exports =  IndividualFarmer