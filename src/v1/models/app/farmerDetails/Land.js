const mongoose = require('mongoose');
const { _collectionName, _status, _areaUnit, _soilType, _landType,_distanceUnit, _yesNo } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const landSchema = new mongoose.Schema({ 
    total_area: { type: Number, required: false },
    land_name: { type: String, required: false },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: _collectionName.farmers, default: null },
    cultivation_area: { 
        type: Number, 
        // validate: {
        //     validator: function(value) {
        //         return value <= this.land_details.totalArea;
        //     },
        //     message: 'Cultivation area must not exceed total land area'
        // }, 
        required: false 
    },
    area: { 
        type: String, 
        required: false 
    },
    area_unit: { 
        type: String, 
        enum: Object.values(_areaUnit), 
        required: false 
    },
    khtauni_number: { type: String },
    khasra_number: { type: String },
    khata_number: { type: String },
    ghat_number: { type: String },
    khewat_number: { type: String },
    karnal_number: { type: String },
    murla_number: { type: String },
    revenue_area_karnal: { type: String },
    revenue_area_murla: { type: String },
    sow_area_karnal: { type: String },
    sow_area_murla: { type: String },
    uplod_document: { type: String },
    soil_type: { 
        type: String, 
        enum: Object.values(_soilType), 
        required: false 
    },
    land_type: { 
        type: String, 
        enum: Object.values(_landType), 
        required: false 
    },
    upload_land_document: { type: String },
    land_address: {
        state_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity' },
        district_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'StateDistrictCity.districts' },
        village: { type: String, required: false },
        pin_code:{type:String,required:false},
        block: { type: String, required: false },
    },
    soil_tested: { type: String, enum: Object.values(_yesNo), required: false },
    uploadSoil_health_card: { type: String }, // if soilTested is true
    opt_for_soil_testing: { type: Boolean, required: false },
    soil_testing_agencies: { type: [String] },
    upload_geotag: { type: String, required: false }, // file upload URL/path

    // haryana farmer fields
    LandCropID: { type: Number, required: false }, // Example: 9179268
    Muraba: { type: String, required: false }, // Example: '14'
    khewat: { type: String, required: false }, // Example: '146'
    sownkanal: { type: Number, required: false }, // Example: 6
    SownMarla: { type: Number, required: false }, // Example: 9
    SownAreaInAcre: { type: Number, required: false }, // Example: 0.806
    RevenueKanal: { type: Number, required: false }, // Example: 6
    RevenueMarla: { type: Number, required: false }, // Example: 10
    RevenueAreaInAcre: { type: Number, required: false }, // Example: 0.813
}, { timestamps: true });
const Land = mongoose.model(_collectionName.Lands, landSchema);
module.exports = { Land };