const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const warehouseDetailsSchema = new mongoose.Schema({
    warehouseOwnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WarehouseV2', // Reference to the parent schema
        required: true,
    },
    basicDetails: {
        warehouseName: { type: String, required: true, trim: true },
        warehouseCapacity: { type: Number, required: true },
        quantityType: {
            type: String,
            default: 'MT',
            enum: ['MT', 'KG', 'L', 'Units'],
        },
        weighBridge: { type: Boolean, default: false },
        storageType: { type: String, enum: ['Dry', 'Cold'], required: true },
    },
    addressDetails: {
        addressLine1: { type: String, required: true, trim: true },
        addressLine2: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        tehsil: { type: String, required: true, trim: true },
        location_url: { type: String, required: true, trim: true },
        state: {
            state_name: { type: String },
            lat: { type: String },
            long: { type: String },
            locationUrl: { type: String }
        },
        district: {
            district_name: { type: String },
            lat: { type: String },
            long: { type: String },
            locationUrl: { type: String }
        },
    },
    inventory: {
        stock: { type: Number, default: 0 },
        requiredStock: { type: Number, default: 0 },
        warehouse_timing: { type: String }
    },
    documents: {
        licenseNumber: { type: String, required: true, trim: true },
        insuranceNumber: { type: String, required: true, trim: true },
        insurancePhoto: { type: String, required: false },
        ownershipType: { type: String, enum: ['Owner', 'Leasehold'], required: true },
        ownershipProof: { type: String, required: true }, // URL for proof document
    },
    authorizedPerson: {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        mobile: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        aadharNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true },
        pointOfContactSame: { type: Boolean, required: true },
        pointOfContact: {
            name: { type: String, trim: true },
            designation: { type: String, trim: true },
            mobileNumber: { type: String },
            email: { type: String, trim: true },
            aadharNumber: { type: String },
            panNumber: { type: String },
        },
    },
    bankDetails: {
        bankName: { type: String, trim: true },
        branchName: { type: String, trim: true },
        accountHolderName: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        ifscCode: { type: String, trim: true },
        passbookProof: { type: String, trim: true }, // URL for proof document
    },
    servicePricing: [
        {
            area: { type: Number, required: true },
            unit: {
                type: String,
                default: 'Sq. Ft.',
                enum: ['Sq. Ft.', 'Sq. M.', 'Acres'],
            },
            price: { type: Number, required: true },
        },
    ],
    activity: {
        ..._commonKeys,
    },
    active: { type: Boolean, default: true },
    wareHouse_code: { type: String, unique: true },
}, { timestamps: true });

warehouseDetailsSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const lastWarehouse = await mongoose
                .model(_collectionName.WarehouseDetails)
                .findOne()
                .sort({ createdAt: -1 });

            let nextIdentifier = 'WH001';

            if (lastWarehouse && lastWarehouse.wareHouse_code) {
                const lastCodeNumber = parseInt(lastWarehouse.wareHouse_code.slice(2), 10);
                nextIdentifier = 'WH' + String(lastCodeNumber + 1).padStart(3, '0');
            }

            this.wareHouse_code = nextIdentifier;
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

const wareHouseDetails = mongoose.model(_collectionName.WarehouseDetails, warehouseDetailsSchema);
module.exports = { wareHouseDetails };

