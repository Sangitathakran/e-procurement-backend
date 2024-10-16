const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const agencySchema = new mongoose.Schema({
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    email: {type: String, lowercase: true, trim: true, unique: true},
    phone: { type: String, trim: true },
    organization_name: { type: String, required:true, trim: true },
    password: { type: String, required: true, trim: true },
    company_logo: { type: String, trim: true },
    user_code: { type: String, unique: true },
    is_password_change: { type: Boolean, default: false },
    is_email_verified: { type: Boolean, default: false },
    is_approved: { type: String, enum: Object.values(_userStatus), default: _userStatus.approved },
    term_condition: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    ..._commonKeys
}, { timestamps: true });


agencySchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    const Agency = mongoose.model(_collectionName.Agency, agencySchema);
    try {
        const lastAgency = await Agency.findOne().sort({ createdAt: -1 });
        let nextUserCode = 'AG00001';
        if (lastAgency && lastAgency.user_code) {
            const lastCodeNumber = parseInt(lastAgency.user_code.slice(2));
            nextUserCode = 'AG' + String(lastCodeNumber + 1).padStart(5, '0');
        }
        this.user_code = nextUserCode;
        next();
    } catch (err) {
        next(err);
    }
});

const Agency = mongoose.model(_collectionName.Agency, agencySchema);
module.exports = { Agency };
