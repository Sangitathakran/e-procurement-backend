const mongoose = require("mongoose");
const { _center_type, _address_type } = require("@src/v1/utils/constants");
const { _collectionName } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");

const ProcurementCenterSchema = new mongoose.Schema(
  {
    center_name: { type: String, required: true, trim: true },
    center_mobile: { type: String, required: true, trim: true },
    center_email: { type: String, required: true, lowercase: true, trim: true },
    center_code: { type: String, unique: true },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: _collectionName.Users,
    },
    center_type: {
      type: String,
      enum: Object.values(_center_type),
      default: _center_type.associate,
    },
    company_details: {
      registration_image: { type: String, trim: true },
      pan_number: { type: String, trim: true },
      owner_name: { type: String, trim: true },
      pan_image: { type: String, trim: true },
    },
    address : {
        line1: { type: String,required: true,trim: true },
        line2: { type: String,trim: true },
        country: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        state_id: { type: mongoose.Schema.Types.ObjectId },
        district_id: { type: mongoose.Schema.Types.ObjectId},
        district: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state_id: { type: mongoose.Types.ObjectId, default: null},
        district_id: { type: mongoose.Types.ObjectId, default: null },
        postalCode: { type: String, required: true, trim: true },
        lat: { type: String, default: null},
        long: { type: String, default: null },
    },
    point_of_contact: {
      name: { type: String, required: true, trim: true },
      email: {
        type: String,
        required: true,
        unique: false,
        lowercase: true,
        trim: true,
      },
      mobile: { type: String, required: true, trim: true },
      designation: { type: String, required: true, trim: true },
      aadhar_number: { type: String, required: true, trim: true },
      aadhar_image: { type: String, required: true, trim: true },
    },
    location_url: { type: String, required: true, trim: true },
    addressType: {
      type: String,
      enum: Object.values(_address_type),
      default: _address_type.Residential,
    },
    bank_details: {
      bank_name: { type: String, trim: true },
      branch_name: { type: String, trim: true },
      account_holder_name: { type: String, trim: true },
      ifsc_code: { type: String, trim: true, },
      account_number: { type: String, trim: true },
      proof: { type: String, trim: true },
    },
    isPrimary: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    ekhrid:{ type: Boolean, default: false },
    ..._commonKeys,
  },
  { timestamps: true }
);

const ProcurementCenter = mongoose.model(
  _collectionName.ProcurementCenter,
  ProcurementCenterSchema
);

module.exports = { ProcurementCenter };
