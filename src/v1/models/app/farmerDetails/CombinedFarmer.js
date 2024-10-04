const mongoose = require('mongoose');
const { _collectionName, _proofType, _titles, _gender, _religion, _maritalStatus, _status, _category, _farmerType, _areaUnit, _khaifCrops, _rabiCrops, _zaidCrops, _individual_category } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const farmerSchema = new mongoose.Schema({
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
        uploadSoilHealthCard: { type: String }, // if soilTested is true
        optForSoilTesting: { type: Boolean, required: true },
        soilTestingAgencies: { type: [String] },
        uploadGeotag: { type: String, required: true } // file upload URL/path
    },
    
    cropDetails: [{
        cropSeason: { 
            type: String, 
            enum: ['Kharif', 'Rabi'], 
            required: true 
        },
        cropName: { type: String, required: true },
        cropVariety: { type: String, required: true },
        sowingDate: { type: Date, required: true },
        harvestingDate: { type: Date, required: true },
        productionQuantity: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        yield: { type: Number, required: true },
        landName: { type: String, required: true },
        cropGrowthStage: { 
            type: String, 
            enum: ['Stage1', 'Stage2', 'Stage3', 'Stage4'] 
        },
        cropDisease: { type: String },
        cropRotation: { type: Boolean, required: true },
        previousCropDetails: {
            cropSeason: { type: String },
            cropName: { type: String }
        }
    }],
    
    insuranceDetails: {
        cropName: { type: String, required: true },
        insuranceCompany: { type: String, required: true },
        landName: { type: String, required: true },
        insuranceWorth: { type: Number, required: true },
        insurancePremium: { type: Number, required: true },
        insuranceStartDate: { type: Date, required: true },
        insuranceEndDate: { type: Date, required: true }
    },
    
    infrastructureNeeds: {
        warehouse: { type: Boolean, required: true },
        coldStorage: { type: Boolean, required: true },
        processingUnit: { type: Boolean, required: true },
        transportationFacilities: { type: Boolean, required: true }
    },
    
    financialSupport: {
        creditFacilities: { type: Boolean, required: true },
        sourceOfCredit: { type: String },
        financialChallenges: { type: String },
        supportRequired: { type: String }
    },
    
    marketingAndOutput: {
        cropSold: { type: String, required: true },
        quantitySold: { type: Number, required: true },
        averageSellingPrice: { type: Number, required: true },
        marketingChannelsUsed: { type: String, required: true },
        challengesFaced: { type: String }
    },
    
    inputDetails: {
        inputType: { 
            type: String, 
            enum: ['Seeds', 'Fertilizer', 'Micronutrients', 'Herbicides', 'Insecticides', 'Fungicides', 'Sprayers', 'Irrigation'], 
            required: true 
        },
        seeds: {
            cropName: { type: String, required: true },
            cropVariety: { type: String, required: true },
            nameOfSeeds: { type: String, required: true },
            nameOfSeedsCompany: { type: String, required: true },
            packageSize: { type: String, required: true },
            totalPackageRequired: { type: Number, required: true },
            dateOfPurchase: { type: Date, required: true }
        }
    },
    steps: [{ 
        label: { type: String },
        screen_number: { type: String, default: "1" },
        status: { type: String, enum: ['active', 'pending', 'completed'], default: "pending" }
    }],

    all_steps_completed_status: { type: Boolean, default: false },
    associate_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: _collectionName.Users, default: null },

    // Fields from the combined schemas
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

    ..._commonKeys
}, { timestamps: true });

const farmer = mongoose.model(_collectionName.farmers, farmerSchema);
module.exports = farmer;
