const { _collectionName, _verificationStatus } = require("@src/v1/utils/constants");
const { default: mongoose } = require("mongoose");

const VerifyfarmerSchema = new mongoose.Schema({
  associate_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.Users,
    default: null,
    index: true
  },
  farmer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.farmers,
    default: null,
    index: true
  },

  request_for_aadhaar: { type: Boolean, default: false },
  request_for_bank: { type: Boolean, default: false },

  is_verify_aadhaar: { type: Boolean, default: false },
  is_verify_aadhaar_date: { type: Date, default: null },

  aadhaar_details: {
    uidai_aadharNo: { type: String, index: true},
    document_type: { type: String },
    reference_id: { type: String },
    name: { type: String },
    date_of_birth: { type: String },
    gender: { type: String },
    mobile: { type: String },
    care_of: { type: String },
    district: { type: String },
    sub_district: { type: String },
    post_office_name: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String },
    vtc_name: { type: String },
   // photo_url: { type: String }, // Instead of base64, store URL/path
  },

  is_verify_bank: { type: Boolean, default: false },
  is_verify_bank_date: { type: Date, default: null },
  bank_details: { type: Object, default: {} },

  status: {
    type: String,
    enum: [_verificationStatus.pending, _verificationStatus.failed, _verificationStatus.succeed],
    default: _verificationStatus.pending
  }
}, { timestamps: true });


const Verifyfarmer = mongoose.model("verfiyfarmer", VerifyfarmerSchema);
module.exports = { Verifyfarmer };