const mongoose = require('mongoose');
const { _collectionName, _status, _areaUnit, _seasons, _seedUsed, _yesNo } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const cropSchema = new mongoose.Schema({
    crop_season: { 
        type: String, 
        enum: Object.values(_seasons), 
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
    },
    marketing_and_output: [{
        crop_sold: { type: String, required: true },
        quantity_sold: { type: Number, required: true },
        average_selling_price: { type: Number, required: true },
        marketing_channels_used: { type: String, required: true },
        challenges_faced: { type: String }
    }],
    
    input_details: [{
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
    }],
}, { timestamps: true, });
const Crop = mongoose.model(_collectionName.Crops, cropSchema);
module.exports = { Crop };