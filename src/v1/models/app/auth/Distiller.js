const mongoose = require("mongoose");
const {
  _collectionName,
  _userType,
  _trader_type,
  _userStatus,
} = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");
const { string } = require("joi");

const distillerSchema = new mongoose.Schema(
  {
    client_id: { type: String, required: true, trim: true },
    basic_details: {
      distiller_details: {
        associate_type: {
          type: String,
          enum: Object.values(_trader_type),
          default: _trader_type.ORGANISATION,
        },
        organization_name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        company_logo: { type: String, trim: true },
      },
      point_of_contact: {
        name: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        mobile: { type: String, trim: true },
        designation: { type: String, trim: true },
        aadhar_number: { type: String, trim: true },
        aadhar_image: {
          front: { type: String, trim: true },
          back: { type: String, trim: true },
        },
      },
      company_owner_info: {
        name: { type: String, trim: true },
        aadhar_number: { type: String, trim: true },
        aadhar_image: {
          front: { type: String, trim: true },
          back: { type: String, trim: true },
        },
        pan_card: { type: String, trim: true },
        pan_image: { type: String, trim: true },
      },
      implementation_agency: { type: String, trim: true },
      cbbo_name: { type: String, trim: true },
    },
    address: {
      registered: {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        country: { type: String, trim: true },
        state: { type: String, trim: true },
        district: { type: String, trim: true },
        taluka: { type: String, trim: true },
        pinCode: { type: String, trim: true },
        village: { type: String, trim: true },
        ar_circle: { type: String, trim: true },
      },
      operational: {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        country: { type: String, trim: true },
        state: { type: String, trim: true },
        district: { type: String, trim: true },
        taluka: { type: String, trim: true },
        pinCode: { type: String, trim: true },
        village: { type: String, trim: true },
      },
    },
    company_details: {
      cin_number: { type: String, trim: true },
      cin_image: { type: String, trim: true },
      tan_number: { type: String, trim: true },
      tan_image: { type: String, trim: true },
      pan_card: { type: String, trim: true },
      pan_image: { type: String, trim: true },
      gst_no: { type: String, trim: true },
      pacs_reg_date: { type: String, trim: true },
    },
    manufactoring_storage: {
      manufactoring_details: { type: Boolean, default: false },
      storage_details: { type: Boolean, default: false },
    },
    authorised: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      aadhar_number: { type: String, trim: true },
      aadhar_certificate: {
        front: { type: String, trim: true },
        back: { type: String, trim: true },
      },
      pan_card: { type: String, trim: true },
      pan_image: { type: String, trim: true },
    },
    bank_details: {
      bank_name: { type: String, trim: true },
      branch_name: { type: String, trim: true },
      account_holder_name: { type: String, rim: true },
      ifsc_code: { type: String, trim: true },
      account_number: { type: String, trim: true },
      upload_proof: { type: String, trim: true },
    },
    distiller_alloc_data: {
      esyq3_ethanol_alloc: { type: String, trim: true },
      esyq3_maize_req: { type: String, trim: true },
      esyq4_ethanol_alloc: { type: String, trim: true },
      esyq4_maize_req: { type: String, trim: true },
      q3q4_ethanol_alloc: { type: String, trim: true },
      q3q4_maize_req: { type: String, trim: true },
    },
    lat_long: { type: String, trim: true },
    user_code: { type: String, unique: true },
    user_type: { type: String, trim: true, enum: Object.values(_userType) },
    is_mobile_verified: { type: String, default: false },
    is_approved: {
      type: String,
      enum: Object.values(_userStatus),
      default: _userStatus.pending,
    },
    is_email_verified: { type: String, default: false },
    is_form_submitted: { type: String, default: false },
    is_welcome_email_send: { type: Boolean, default: false },
    is_sms_send: { type: Boolean, default: false },
    term_condition: { type: String, default: false },
    mou: { type: String, default: false },
    mou_document: { type: String },
    mou_approval: {
      type: String,
      enum: Object.values(_userStatus),
      default: _userStatus.pending,
    },
    active: { type: Boolean, default: true },
    source_by: { type: String, default: "NCCF" },
    ..._commonKeys,
  },
  { timestamps: true }
);

distillerSchema.pre("save", async function (next) {
  if (!this.isNew) return next();
  const Distiller = mongoose.model(_collectionName.Distiller, distillerSchema);
  try {
    const lastUser = await Distiller.findOne().sort({ createdAt: -1 });
    let nextUserCode = "AS00001";
    if (lastUser && lastUser.user_code) {
      const lastCodeNumber = parseInt(lastUser.user_code.slice(2));
      nextUserCode = "AS" + String(lastCodeNumber + 1).padStart(5, "0");
    }
    this.user_code = nextUserCode;
    next();
  } catch (err) {
    next(err);
  }
});

const Distiller = mongoose.model(_collectionName.Distiller, distillerSchema);
module.exports = { Distiller };
