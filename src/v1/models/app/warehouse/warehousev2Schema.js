const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const warehousev2Schema = new mongoose.Schema({
    password: { type: String, },
    mobile_verified: { type: Boolean, default: false },
    user_type: { type: String },
    companyDetails: {
        name: { type: String, trim: true },
        type: { type: String, trim: true },
        cinNumber: { type: String, trim: true },
        cinDocument: { type: String, trim: true },
        tanNumber: { type: String, trim: true },
        tanDocument: { type: String, trim: true },
        panNumber: { type: String, trim: true },
        panDocument: { type: String, trim: true },
        gstNumber: { type: String, trim: true },
        gstDocument: { type: String, trim: true }
    },
    ownerDetails: {
        name: { type: String, trim: true },
        mobile: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        aadharNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true },
        aadharDocument: { type: String, trim: true },
        panDocument: { type: String, trim: true }
    },
    bankDetails: [{
        bankName: { type: String, trim: true },
        branchName: { type: String, trim: true },
        accountHolderName: { type: String, trim: true },
        ifscCode: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        confirmAccountNumber: { type: String, trim: true },
        proofDocument: { type: String, trim: true }
    }],
    activity: {
        ..._commonKeys,
    },
    registered_time: { type: Date, default: Date.now },
    is_email_verified: { type: String, default: false },
    is_form_submitted: { type: String, default: false },
    is_sms_send: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    warehouse_code: { type: String },
}, { timestamps: true });

warehousev2Schema.pre('save', async function (next) {
    if (this.isNew && !this.warehouse_code) {
        try {
            const Warehouse = mongoose.model(_collectionName.Warehouse, warehousev2Schema);

            const lastWarehouse = await Warehouse.findOne().sort({ createdAt: -1 });
            let nextWarehouseCode = 'WH00001';

            if (lastWarehouse && lastWarehouse.warehouse_code) {
                const lastCodeNumber = parseInt(lastWarehouse.warehouse_code.slice(2), 10);
                nextWarehouseCode = 'WH' + String(lastCodeNumber + 1).padStart(5, '0');
            }

            this.warehouse_code = nextWarehouseCode;
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

const wareHousev2 = mongoose.model(_collectionName.Warehouse, warehousev2Schema);
module.exports = { wareHousev2 };