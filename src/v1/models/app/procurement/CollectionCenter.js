const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');


const CollectionCenterSchema = new mongoose.Schema({
    agencyId: {type: String, default: null},
    user_id : { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    address : {
        line1: { type: String,required: true,trim: true },
        line2: { type: String,trim: true },
        country: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        district: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        lat: { type: String, default: null},
        long: { type: String, default: null },
    },
    point_of_contact: {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true,lowercase: true, trim: true },
        mobile: { type: String, required: true, trim: true },
        designation: { type: String, required: true, trim: true },
        aadhar_number: { type: String, required: true, trim: true },
        aadhar_image: { type: String, required: true, trim: true },
    },
    addressType: {type: String, enum: ['Residential', 'Business', 'Billing', 'Shipping'], required: true, default: 'Residential'},
    isPrimary: {type: Boolean, default: false },
    ..._commonKeys
}, { timestamps: true });

const CollectionCenter = mongoose.model(_collectionName.CollectionCenter, CollectionCenterSchema);

module.exports = { CollectionCenter };

