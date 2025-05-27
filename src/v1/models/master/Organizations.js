const mongoose = require('mongoose');
const { _status, _collectionName } = require('@src/v1/utils/constants');

const OrganizationSchema = new mongoose.Schema({
    name: { type: String, default: "" },
    alias: { type: String, default: "" },
    metaInfo: { type: Object, default: {}, },
    status: { type: String, default: _status.active, enum: Object.keys(_status) },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, default: null },
}, { timestamps: true })

// Define Search Indexes
OrganizationSchema.index("account_id")
OrganizationSchema.index("status")

/**
 * 
 * @param {mongoose} mongoose 
 * @returns {mongoose.Model}
 */
const OrganizationModel = (mongoose) => {
    return mongoose.model(_collectionName.Organization, OrganizationSchema)
}
const Organizations = mongoose.model(_collectionName.Organization, OrganizationSchema)

module.exports = { Organizations, OrganizationModel }