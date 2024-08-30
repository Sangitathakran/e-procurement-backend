const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { _collectionName, _account_status } = require('@src/v1/utils/constants');

const AccountSchema = new mongoose.Schema({
    user_name: { type: String, unique: true, require: true },
    company_name: { type: String, require: true },
    email: { type: String, require: true, default: null },
    password: { type: String, default: "", },
    secret_key: { type: String, default: "", },
    status: { type: String, default: _account_status.Active, enum: Object.keys(_account_status) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'account', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'account', default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'account', default: null },
    deletedAt: { type: Date, default: null }
}, { timestamps: true })

AccountSchema.index("user_name")

// Save email to lowercase and save password with encryption
AccountSchema.pre('save', async function (next) {
    const account = this
    account.email = account.email.toLowerCase() || account.email
    if (account.isModified('password')) {
        account.password = await bcrypt.hash(account.password, 10)
    }
    next()
})

/**
 * 
 * @param {mongoose} mongoose 
 * @returns {mongoose.Model}
 */
const AccountModel = (mongoose) => {
    return mongoose.model(_collectionName.Account, AccountSchema)
}
const Accounts = mongoose.model(_collectionName.Account, AccountSchema)

module.exports = { Accounts, AccountModel }