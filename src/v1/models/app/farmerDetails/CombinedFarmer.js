const mongoose = require('mongoose');
const { _collectionName, _proofType, _titles, _gender, _religion, _maritalStatus, _status, _category, _farmerType, _areaUnit, _khaifCrops, _rabiCrops, _zaidCrops, _individual_category } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const farmerSchema = new mongoose.Schema({
    associate_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: _collectionName.Users, default: null },
    mobile_no: { type: String, required: true },
    name: { type: String, default: null },
    is_verify_otp: { type: Boolean, default: false },
    farmer_id: { type: String, default: null },
    is_welcome_msg_send: { type: Boolean, default: false },

    user_type: { 
        type: String, 
        enum: ['Farmer', 'FPO', 'Trader', 'Corporate', 'Miller'], 
        required: true 
    },
    
    basic_details: { 
        name: { type: String, trim: true },
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
        state: { type: String, trim: true },
        district: { type: String, trim: true },
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
        proof_doc_key: { type: String, trim: true }
    },
    land_details: { 
        area: { type: Number, required: true },
        cultivation_area: { 
            type: Number, 
            validate: {
                validator: function(value) {
                    return value <= this.land_details.totalArea;
                },
                message: 'Cultivation area must not exceed total land area'
            }, 
            required: true 
        },
        area_unit: { 
            type: String, 
            enum: Object.values(_areaUnit).slice(0, 2), 
            required: true 
        },
        state: { type: String, required: true },
        district: { type: String, required: true },
        village: { type: String, required: true },
        block: { type: String, required: true },
        khtauni_number: { type: String },
        khasra_number: { type: String },
        khata_number: { type: String },
        soil_type: { 
            type: String, 
            enum: ['Sandy', 'Clay', 'Loamy'], 
            required: true 
        },
        soil_tested: { type: Boolean, required: true },
        uploadSoil_health_card: { type: String }, // if soilTested is true
        opt_for_soil_testing: { type: Boolean, required: true },
        soil_testing_agencies: { type: [String] },
        upload_geotag: { type: String, required: true } // file upload URL/path
    },
    
    crop_details: [{
        crop_season: { 
            type: String, 
            enum: ['Kharif', 'Rabi'], 
            required: true 
        },
        crop_name: { type: String, required: true },
        crop_variety: { type: String, required: true },
        sowing_date: { type: Date, required: true },
        harvesting_date: { type: Date, required: true },
        production_quantity: { type: Number, required: true },
        selling_price: { type: Number, required: true },
        yield: { type: Number, required: true },
        land_name: { type: String, required: true },
        crop_growth_stage: { 
            type: String, 
            enum: ['Stage1', 'Stage2', 'Stage3', 'Stage4'] 
        },
        crop_disease: { type: String },
        crop_rotation: { type: Boolean, required: true },
        previous_crop_details: {
            crop_season: { type: String },
            crop_name: { type: String }
        }
    }],
    
    insurance_details: {
        crop_name: { type: String, required: true },
        insurance_company: { type: String, required: true },
        land_name: { type: String, required: true },
        insurance_worth: { type: Number, required: true },
        insurance_premium: { type: Number, required: true },
        insurance_start_date: { type: Date, required: true },
        insurance_end_date: { type: Date, required: true }
    },
    
    infrastructure_needs: {
        warehouse: { type: Boolean, required: true },
        cold_storage: { type: Boolean, required: true },
        processing_unit: { type: Boolean, required: true },
        transportation_facilities: { type: Boolean, required: true }
    },
    
    financial_support: {
        credit_facilities: { type: Boolean, required: true },
        source_of_credit: { type: String },
        financial_challenges: { type: String },
        support_required: { type: String }
    },
    
    marketing_and_output: {
        crop_sold: { type: String, required: true },
        quantity_sold: { type: Number, required: true },
        average_selling_price: { type: Number, required: true },
        marketing_channels_used: { type: String, required: true },
        challenges_faced: { type: String }
    },
    
    input_details: {
        input_type: { 
            type: String, 
            enum: ['Seeds', 'Fertilizer', 'Micronutrients', 'Herbicides', 'Insecticides', 'Fungicides', 'Sprayers', 'Irrigation'], 
            required: true 
        },
        seeds: {
            crop_name: { type: String, required: true },
            crop_variety: { type: String, required: true },
            name_of_seeds: { type: String, required: true },
            name_of_seeds_company: { type: String, required: true },
            package_size: { type: String, required: true },
            total_package_required: { type: Number, required: true },
            date_of_purchase: { type: Date, required: true }
        }
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
        aadhar_no: { type: String, required: true, trim: true },
    },
    status: { type: String, enum: Object.values(_status), default: _status.active },
    steps: [{ 
        label: { type: String },
        screen_number: { type: String, default: "1" },
        status: { type: String, enum: ['active', 'pending', 'completed'], default: "pending" }
    }],

    all_steps_completed_status: { type: Boolean, default: false },
    ..._commonKeys
}, { timestamps: true });

const farmer = mongoose.model(_collectionName.farmers, farmerSchema);
module.exports = farmer;
