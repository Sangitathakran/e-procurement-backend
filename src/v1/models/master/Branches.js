const mongoose = require('mongoose');
const {_status, _collectionName } = require('@src/v1/utils/constants'); 
const { generateRandomId } = require('@src/v1/utils/helpers/randomIdGenerator');


const branchSchema = new mongoose.Schema({
    branchName: {
        type: String,
        required: true,
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
    },
    pointOfContact: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true, lowercase: true }
    },
    address: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: _status.inactive, // Default value as inactive
        enum: Object.keys(_status)
    },
    headOfficeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'headOffice',
        required: true
    }
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
      const newBranchId = generateRandomId('BO', 4); // Generate random alphanumeric string
      const existingBranch = await Branches.findOne({ branchId: newBranchId });
  
      if (!existingBranch) {
        branch.branchId = newBranchId; // Assign the unique BranchId
        isUnique = true;
      }
    }
  
    next();
  });
  

// Indexes for search optimization
branchSchema.index({ emailAddress: 1 }, { unique: true });  
branchSchema.index({ branchName: 1 }); 
branchSchema.index({ branchId: 1 }); 
branchSchema.index({ pointOfContact: 1 });  

const Branches = mongoose.model(_collectionName.Branch, branchSchema);

module.exports = {Branches};
