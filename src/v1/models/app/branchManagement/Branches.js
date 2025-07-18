const mongoose = require('mongoose');
const { _status, _userType, _collectionName } = require('@src/v1/utils/constants');
const { generateRandomId } = require('@src/v1/utils/helpers/randomGenerator');
const { required } = require('joi');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');


const branchSchema = new mongoose.Schema({
  branchName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100, // Max 100 characters
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  branchId: {
    type: String,
    unique: true,
  },
  emailAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxLength: 100, // Max 100 characters
  },
  pointOfContact: {
    name: { type: String, required: true, trim: true, maxLength: 100 }, // Max 100 characters
    phone: { type: String, required: false, trim: true, match: /^\d{10}$/ }, // Exactly 10 digits
    email: { type: String, required: true, lowercase: true, trim: true, maxLength: 100 }, // Max 100 characters
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxLength: 255, // Max 255 characters
  },
  password: {
    type: String,
    required:true,
  },
  isPasswordChanged: {
    type: Boolean,
    default: false,
  },
  cityVillageTown: {
    type: String,
    required: false,
    trim: true,
    maxLength: 100, // Max 100 characters
  },
  district: {
    type: String,
    trim: true,
    maxLength: 100, // Max 100 characters
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100, // Max 100 characters
  },
  pincode: {
    type: String,
    required: false,
    trim: true,
    match: /^\d{6}$/, // Max 6 digits
  },
  status: {
    type: String,
    default: _status.active,
    enum: Object.keys(_status),
  },
  headOfficeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: _collectionName.HeadOffice,
    required: true,
  },
  user_type: { type: String, trim: true, enum: Object.values(_userType) },
  source_by: { type: String, default: "NCCF" },
  ..._commonKeys
}, { timestamps: true });

// Pre-save hook to generate a unique random BranchId
branchSchema.pre('save', async function (next) {
    const branch = this;
  
    // If branchId is already set, skip generating a new one
    if (branch.branchId) {
      return next();
    }
  
    // Generate a new random BranchId and ensure its uniqueness
    let isUnique = false;
    while (!isUnique) {
      const newBranchId = generateRandomId('BO', 4); // Generate random string
      const existingBranch = await Branches.findOne({ branchId: newBranchId });
  
      if (!existingBranch) {
        branch.branchId = newBranchId; // Assign the unique BranchId
        isUnique = true;
      }
    }
  
    next();
  }); 

const Branches = mongoose.model(_collectionName.Branch, branchSchema);

module.exports = {Branches};
