const mongoose = require('mongoose');
const {  _collectionName } = require('@src/v1/utils/constants'); 


const branchSchema = new mongoose.Schema({
    branchName: {
        type: String,
        required: true,
    },
    emailAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    pointOfContact: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        default: false,
    },
    headOfficeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'headOffice',
        required: true
    }
}, { timestamps: true });

// Indexes for search optimization
branchSchema.index({ emailAddress: 1 }, { unique: true });  
branchSchema.index({ branchName: 1 }); 
branchSchema.index({ pointOfContact: 1 });  

const Branches = mongoose.model(_collectionName.Branch, branchSchema);

module.exports = Branches;
