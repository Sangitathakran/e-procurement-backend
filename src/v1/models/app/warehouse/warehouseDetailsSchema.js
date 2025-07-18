const mongoose = require("mongoose");
const { _collectionName } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");

const warehouseDetailsSchema = new mongoose.Schema(
  {
    warehouseDetailsId: { type: String, unique: true },
    warehouseOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WarehouseV2", // Reference to the parent schema
      required: true,
    },
    basicDetails: {
      warehouseName: { type: String, required: false, trim: true },
      warehouseCapacity: { type: Number, required: false },
      quantityType: {
        type: String,
        default: "MT",
        enum: ["MT", "KG", "L", "Units"],
      },
      weighBridge: { type: Boolean, default: false },
      storageType: { type: String, enum: ["Dry", "Cold"], required: false },
    },
    addressDetails: {
      addressLine1: { type: String, required: false, trim: true },
      addressLine2: { type: String, required: false, trim: true },
      pincode: { type: String, required: false, trim: true },
      city: { type: String, required: false, trim: true },
      tehsil: { type: String, required: false, trim: true },
      location_url: { type: String, required: false, trim: true },
      lat: { type: String },
      long: { type: String },
      state: {
        state_name: { type: String },
        lat: { type: String },
        long: { type: String },
        locationUrl: { type: String },
      },
      district: {
        district_name: { type: String },
        lat: { type: String },
        long: { type: String },
        locationUrl: { type: String },
      },
    },
    inventory: {
      stock: { type: Number, default: 0 },
      requiredStock: { type: Number, default: 0 },
      warehouse_timing: { type: String },
    },
    documents: {
      licenseNumber: { type: String, required: false, trim: true },
      insuranceNumber: { type: String, required: false, trim: true },
      insurancePhoto: { type: String, required: false },
      ownershipType: {
        type: String,
        enum: ["Owner", "Leasehold"],
        required: false,
        default: "Owner"
      },
      ownershipProof: { type: String, required: false }, // URL for proof document
    },
    authorizedPerson: {
      name: { type: String, trim: true },
      designation: { type: String, trim: true },
      mobile: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      aadharNumber: { type: String, trim: true },
      aadhar_back: { type: String, trim: true },
      aadhar_front: { type: String, trim: true },
      panNumber: { type: String, trim: true },
      panImage: { type: String, trim: true },
      pointOfContactSame: { type: Boolean, required: false },
      pointOfContact: {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        mobileNumber: { type: String },
        email: { type: String, trim: true },
        aadharNumber: { type: String },
        aadhar_back: { type: String, trim: true },
        aadhar_front: { type: String, trim: true },
        panNumber: { type: String },
        panImage: { type: String, trim: true },

      },
    },
    bankDetails: {
      bankName: { type: String, trim: true },
      branchName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: false },
      ifscCode: { type: String, trim: false },
      passbookProof: { type: String, trim: false }, // URL for proof document
    },
    servicePricing: [
      {
        area: { type: Number, required: false },
        unit: {
          type: String,
          default: "Sq. Ft.",
          enum: ["Sq. Ft.", "Sq. M.", "Acres"],
        },
        price: { type: Number, required: false },
      },
    ],
    activity: {
      ..._commonKeys,
    },
    active: { type: Boolean, default: true },
    procurement_partner: { type: String, enum: ["Radiant", "Youkta", "Beam", "Agribid", "Supplyvalid", "NEML", "Others"], default: "Radiant" },
    wareHouse_code: { type: String, unique: true },
  },
  { timestamps: true }
);

warehouseDetailsSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const lastWarehouse = await mongoose
        .model(_collectionName.WarehouseDetails)
        .aggregate([
          { $match: { wareHouse_code: { $regex: /^WH\d{3}$/ } } },
          {
            $addFields: {
              codeNumber: {
                $toInt: { $substr: ["$wareHouse_code", 2, 3] }
              }
            }
          },
          { $sort: { codeNumber: -1 } },
          { $limit: 1 },
        ]);

      const lastCode = lastWarehouse.length
        ? lastWarehouse[0].wareHouse_code
        : "WH000";

      const nextCodeNumber = parseInt(lastCode.slice(2)) + 1;
      this.wareHouse_code = `WH${String(nextCodeNumber).padStart(3, "0")}`;

      next();
    } catch (err) {
      console.error("Error generating wareHouse_code:", err);
      next(err);
    }
  } else {
    next();
  }
});

const wareHouseDetails = mongoose.model(
  _collectionName.WarehouseDetails,
  warehouseDetailsSchema
);
module.exports = { wareHouseDetails };

