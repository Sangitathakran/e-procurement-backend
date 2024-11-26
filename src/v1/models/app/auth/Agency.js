const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus, _statusType } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const agencySchema = new mongoose.Schema({
    agent_name: { type: String, trim: true },
    email: {type: String, lowercase: true, trim: true},
    phone: { type: String, trim: true },
    agent_id: { type: String},
    status: { type: String,enum: Object.values(_statusType) ,default: 'inactive' },
    bank_details: {
        bank_name: { type: String, trim: true },
        branch_name: { type: String, trim: true },
        account_holder_name: { type: String, trim: true },
        ifsc_code: { type: String, trim: true },
        account_no: { type: String, trim: true },
        proof_doc_key: { type: String, trim: true }
    },

    ..._commonKeys
}, { timestamps: true });


agencySchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    const Agency = mongoose.model(_collectionName.Agency, agencySchema);
    try {
        const lastAgency = await Agency.findOne().sort({ createdAt: -1 });
        let nextUserCode = 'AG00001';
        if (lastAgency && lastAgency.agent_id) {
            const lastCodeNumber = parseInt(lastAgency.agent_id.slice(2));
            nextUserCode = 'AG' + String(lastCodeNumber + 1).padStart(5, '0');
        }
        this.agent_id = nextUserCode;
        next();
    } catch (err) {
        next(err);
    }
});

const Agency = mongoose.model(_collectionName.Agency, agencySchema);
module.exports = { Agency };
