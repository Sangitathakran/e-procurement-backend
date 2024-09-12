const mongoose = require('mongoose');
const { _center_type, _address_type } = require('@src/v1/utils/constants');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');


const CollectionCenterSchema = new mongoose.Schema({
    agencyId: {type: String, default: null},
    center_code: { type: String, unique: true },
    user_id : { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    center_type : { type: String, enum: Object.values(_center_type), default: _center_type.associate },
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
    addressType: { type: String, enum: Object.values(_address_type), default: _address_type.Residential },
    isPrimary: {type: Boolean, default: false },
    active: {type: Boolean,default: true},
    ..._commonKeys
}, { timestamps: true });

CollectionCenterSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    const CollectionCenter = mongoose.model(_collectionName.CollectionCenter, CollectionCenterSchema);

    try {
        const lastCenter = await CollectionCenter.findOne().sort({ createdAt: -1 });
        let nextCenterCode = 'CC00001';

        if (lastCenter && lastCenter.center_code) {
            const lastCodeNumber = parseInt(lastCenter.center_code.slice(2), 10); 
            nextCenterCode = 'CC' + String(lastCodeNumber + 1).padStart(5, '0');
        }

        this.center_code = nextCenterCode;
        next();
    } catch (err) {
        next(err);
    }
});

const CollectionCenter = mongoose.model(_collectionName.CollectionCenter, CollectionCenterSchema);

module.exports = { CollectionCenter };

