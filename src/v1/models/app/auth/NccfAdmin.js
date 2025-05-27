const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type, _userStatus, _statusType } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const nccfSchema = new mongoose.Schema({
    nccf_name: { type: String, trim: true },
    email: {type: String, lowercase: true, trim: true},
    phone: { type: String, trim: true },
    nccf_id: { type: String},
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

nccfSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    try {
        const lastNccf = await NccfAdmin.findOne().sort({ createdAt: -1 });

        let nextUserCode = 'NC00001';
        if (lastNccf && lastNccf.nccf_id) {
            const lastCodeNumber = parseInt(lastNccf.nccf_id.slice(2), 10);
            nextUserCode = 'NC' + String(lastCodeNumber + 1).padStart(5, '0');
        }

        this.nccf_id = nextUserCode;
        next();
    } catch (err) {
        next(err);
    }
});

const NccfAdmin = mongoose.model(_collectionName.NccfAdmin, nccfSchema);
module.exports = { NccfAdmin };
