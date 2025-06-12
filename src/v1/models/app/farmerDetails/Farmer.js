const mongoose = require('mongoose');
const { _collectionName, _proofType, _titles, _gender, _religion, _maritalStatus, _status, _category, _farmerType, _areaUnit, _khaifCrops, _rabiCrops, _zaidCrops, _individual_category } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const farmerSchema = new mongoose.Schema({
    associate_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: _collectionName.Users, default: null },
    mobile_no: { type: String, required: false },
    name: { type: String, default: null },
    is_verify_otp: { type: Boolean, default: false },
    farmer_id: { type: String, default: null },
    is_welcome_msg_send: { type: Boolean, default: false },
    harynaNewFarmer_code: { type: String, default: null },
    farmer_type: {
        type: String,
        enum: ['Individual', 'Associate'],
        required: false
    },
    user_type: { type: String,default:"1", required: false },
    farmer_code: { type: String, trim: true, },
    basic_details: { 
        name: { type: String, trim: true },
        profile_pic:{ type: String, trim: true },
        email: { type: String, trim: false },
        father_husband_name: { type: String, trim: true },
        mobile_no: { type: String, trim: true },
        category: { type: String, enum: Object.values(_individual_category), trim: false },
        dob: { type: String, trim: true },
        age: { type: String, trim: true },
        farmer_type: { type: String, enum: Object.values(_farmerType), trim: false },
        gender: { type: String, enum: Object.values(_gender), trim: false }
    },

    address: {
        address_line_1: { type: String, trim: true },
        address_line_2: { type: String, trim: true },
        country: { type: String, trim: true },
        state_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity' ,default:'66d8438dddba819889f4ee0f'},
        district_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity.districts', default:'66d8438dddba819889f4ee17' },
        tahshil: { type: String, trim: true },
        block: { type: String, trim: false },
        village: { type: String, trim: false },
        pin_code: { type: String, trim: true },
        lat: { type: String, trim: false },
        long: { type: String, trim: true },
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
        account_no: { type: String, trim: true },
        proof_doc_key: { type: String, trim: true },
        accountstatus: { type: String, trim:true},
        is_verified: { type: Boolean, default: false }
    },
    land_details: [{ land_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Lands, required: false } }],

    crop_details: [{
        crop_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Crops, required: false }
    }],
    
    infrastructure_needs: {
        warehouse: { type: Boolean, required: false },
        cold_storage: { type: Boolean, required: false },
        processing_unit: { type: Boolean, required: false },
        transportation_facilities: { type: Boolean, required: false }
    },

    financial_support: {
        credit_facilities: { type: Boolean, required: false },
        source_of_credit: { type: String },
        financial_challenges: { type: String },
        support_required: { type: String }
    },
    parents: {
        father_name: { type: String, trim: true },
        mother_name: { type: String, trim: true }
    },
    marital_status: { type: String, enum: Object.values(_maritalStatus), default: null, trim: true },
    religion: { type: String, enum: Object.values(_religion), default: null, trim: true },
    education: {
        highest_edu: { type: String, trim: true },
        edu_details: [{ type: String, trim: true }],
    },
    proof: {
        type: { type: String, enum: Object.values(_proofType), default: null, trim: true },
        doc: { type: String, trim: true },
        aadhar_no: { type: String, required: false, trim: true },
    },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    // steps: [{
    //     label: { type: String },
    //     screen_number: { type: String, default: "1" },
    //     status: { type: String, enum: ['active', 'pending', 'completed'], default: "pending" }
    // }],

    external_farmer_id: { type: Number, require: true, unique: true },
    hr_p_code: {
        p_DCodeLGD: { type: String, required: false },  // Example: '64'
        p_BtCodeLGD: { type: String, required: false }, // Example: '496'
        p_WvCodeLGD: { type: String, required: false }, // Example: '61939'
        p_address: { type: String, required: false },   // Example: 'JHAJJAR,MATANHAIL BL,Khaparwas'
        Dis_code: { type: String, required: false },    // Example: '07'
        Teh_code: { type: String, required: false },    // Example: '045'
        Vil_code: { type: String, required: false },    // Example: '03448'
        statecode: { type: String, required: false },   // Example: '06'
      },
    date: { type: String, default: new Date().toISOString().split("T")[0] },

    all_steps_completed_status: { type: Boolean, default: false },
    ..._commonKeys
}, { timestamps: true });

const farmer = mongoose.model(_collectionName.farmers, farmerSchema);
module.exports = { farmer };
