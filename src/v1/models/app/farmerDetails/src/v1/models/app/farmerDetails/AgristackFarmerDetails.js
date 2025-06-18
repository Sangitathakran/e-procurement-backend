const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');

const JointOwnerSchema = new mongoose.Schema({
  owner_number: String,
  main_owner_number: mongoose.Schema.Types.Mixed,
  owner_name_ror: String,
  owner_identifier_name: String,
  owner_identifier_relationship: String,
}, { _id: false });

const LandDataSchema = new mongoose.Schema({
  //farmer_id: String,
  owner_name_ror: String,
  farm_id: String,
  joint_owners: [JointOwnerSchema],
  village_lgd_code: String,
  district_lgd_code: String,
  sub_district_lgd_code: String,
  survey_number: String,
  sub_survey_number: String,
  plotGeometry: mongoose.Schema.Types.Mixed,
  ulpin: String,
  plot_area: String,
  area_unit: String,
  land_usage_type: String
}, { _id: false });

const CropSownDataSchema = new mongoose.Schema({
 // farmer_id: String,
  farm_id: String,
  village_lgd_code: String,
  district_lgd_code: String,
  sub_district_lgd_code: String,
  survey_number: String,
  sub_survey_number: String,
  year: String,
  season: String,
  sown_area: Number,
  sown_area_unit: String,
  crop_code: String,
  crop_photo: [String],
  sown_area_geometry: {
    type: mongoose.Schema.Types.Mixed, // or use { type: Object } strictly
  },
  sowing_date: String,
  irrigation_type: String,
  owner_name_ror: String,
  joint_owners: [JointOwnerSchema]
}, { _id: false });

const FarmerDataSchema = new mongoose.Schema({
 // farmer_id: String,
  farmer_name: String,
  aadhaar_type: String,
  aadhaar: String,
  aadhaar_hash: String,
  dob: String,
  gender: String,
  state_lgd_code: String,
  district_lgd_code: String,
  sub_district_lgd_code: String,
  village_lgd_code: String,
  mobile_no: String,
  address: String,
  farmer_category: String,
  identifier_type: String,
  identifier_name: String,
  caste_category: String
}, { _id: false });

const AgristackFarmerDetailsSchema = new mongoose.Schema({
  farmer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.farmers,
    required: true,
    index: true,
    unique: true
  },
  cpmu_farmer_id: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  isAgristackVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  farmerData: FarmerDataSchema,
  land_data: [LandDataSchema],
  crop_sown_data: [CropSownDataSchema],
  ..._commonKeys,
  
}, { timestamps: true });

module.exports = mongoose.model(_collectionName.AgristackFarmerDetail, AgristackFarmerDetailsSchema);