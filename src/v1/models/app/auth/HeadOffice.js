const mongoose = require('mongoose');
const { _collectionName, _userType, _trader_type } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');

const headOfficeSchema = new mongoose.Schema({
    office_id: {type: String, required: true, trim: true},
    password: {type: String, required: true},
    email_verified: {type: Boolean, default: false},
    user_type: {type: String, default: "5"},
    company_details: {
        name: {type: String, trim: true},
        pan_card: {type: String, trim: true},
        pan_image: {type: String, trim: true},
        agreement: {type: String, trim: true},
    },
    point_of_contact: {
        name: {type: String, trim: true},
        email: {type: String, lowercase: true, trim: true, unique: true},
        mobile: {type: String, trim: true},
        designation: {type: String, trim: true},
        aadhar_number: {type: String, trim: true},
        aadhar_image: {
            front: {type: String, trim: true},
            back: {type: String, trim: true},
        },
    },
    address: {
        line1: {type: String, trim: true},
        line2: {type: String, trim: true},
        state: {type: String, trim: true},
        district: {type: String, trim: true},
        city: {type: String, trim: true},
        pinCode: {type: String, trim: true},
    },
    authorised: {
        name: {type: String, trim: true},
        designation: {type: String, trim: true},
        phone: {type: String, trim: true},
        email: {type: String, trim: true, unique: true},
        aadhar_number: {type: String, trim: true},
        aadhar_certificate: {
            front: {type: String, trim: true},
            back: {type: String, trim: true},
        },
    },
    activity: {
        ..._commonKeys,
    },
    registered_time: {type: Date, default: Date.now},
    active: {type: Boolean, default: true},
    is_password_change: {type: Boolean, default: false},
    head_office_code: {type: String, unique: true},
}, {timestamps: true});


headOfficeSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    const HeadOffice = mongoose.model(_collectionName.HeadOffice, headOfficeSchema);
    try {
        const lastUser = await HeadOffice.findOne().sort({ createdAt: -1 });
        let nextUserCode = 'HO00001';

        if (lastUser && lastUser.head_office_code) {  
            const lastCodeNumber = parseInt(lastUser.head_office_code.slice(2), 10);
            nextUserCode = 'HO' + String(lastCodeNumber + 1).padStart(5, '0');
        }

        this.head_office_code = nextUserCode;
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model(_collectionName.HeadOffice, headOfficeSchema);
