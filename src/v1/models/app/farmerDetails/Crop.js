const mongoose = require("mongoose");
const {
  _collectionName,
  _status,
  _areaUnit,
  _seasons,
  _seedUsed,
  _yesNo,
} = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");
const cropSchema = new mongoose.Schema(
  {
    crop_season: {
      type: String,
      enum: Object.values(_seasons),
      required: false,
    },
    farmer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: _collectionName.farmers,
      default: null,
    },
    land_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.Lands,
      required: false,
    },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: _collectionName.farmers, default: null, index: true  },
    land_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Lands, required: false },
    crop_name: { type: String, required: false },
    crop_variety: { type: String, required: false },
    sowing_date: { type: Date, required: false, index: true  },
    harvesting_date: { type: Date, required: false },
    production_quantity: { type: Number, required: false },
    selling_price: { type: Number, required: false },
    yield: { type: Number, required: false },
    land_name: { type: String, required: false },
    crop_growth_stage: {
      type: String,
      enum: ["Stage1", "Stage2", "Stage3", "Stage4"],
    },
    crop_disease: { type: String },
    crop_rotation: { type: Boolean, required: false },
    previous_crop_details: {
      crop_season: { type: String, enum: Object.values(_seasons) },
      crop_name: { type: String },
    },
    marketing_and_output: [
      {
        crop_sold: { type: String, required: false },
        quantity_sold: { type: Number, required: false },
        average_selling_price: { type: Number, required: false },
        marketing_channels_used: { type: String, required: false },
        challenges_faced: { type: String },
      },
    ],
    insurance_details: [
      {
        insurance_company: { type: String, required: false },
        insurance_worth: { type: Number, required: false },
        insurance_premium: { type: Number, required: false },
        insurance_start_date: { type: String, required: false },
        insurance_end_date: { type: String, required: false },
      },
    ],
    input_details: [
      {
        input_type: {
          type: String,
          enum: [
            "Seeds",
            "Fertilizer",
            "Micronutrients",
            "Herbicides",
            "Insecticides",
            "Fungicides",
            "Sprayers",
            "Irrigation",
          ],
          required: false,
        },
        seeds: {
          crop_name: { type: String, required: false },
          crop_variety: { type: String, required: false },
          name_of_seeds: { type: String, required: false },
          name_of_seeds_company: { type: String, required: false },
          package_size: { type: String, required: false },
          total_package_required: { type: Number, required: false },
          date_of_purchase: { type: Date, required: false },
        },
      },
    ],

    // haryana farmer fields
    seasonname: { type: String, required: false }, // Example: 'Rabi 2024-25'
    seasonid: { type: Number, required: false }, // Example: 16
    L_LGD_DIS_CODE: { type: String, required: false }, // Example: '64'
    L_LGD_TEH_CODE: { type: String, required: false }, // Example: '410'
    L_LGD_VIL_CODE: { type: String, required: false }, // Example: '61939'
    SownCommodityID: { type: Number, required: false }, // Example: 42
    SownCommodityName: { type: String, required: false }, // Example: 'Mustard'
    CommodityVariety: { type: String, required: false }, // Example: 'आर एच - 0406'
  },
  { timestamps: false }
);
const Crop = mongoose.model(_collectionName.Crops, cropSchema);
module.exports = { Crop };
