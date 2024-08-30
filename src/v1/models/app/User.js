const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const { _collectionName } = require('@src/v1/utils/constants');


const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    mobile_number: { type: Number, unique: true, required: true },
    password: { type: String, required: true },
    ..._commonKeys
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) return next();
    const hash = await bcrypt.hash(user.password, 10);
    user.password = hash;
    next();
});

/**
 * 
 * @param {mongoose} mongoose 
 * @returns {mongoose.Model}
 */
const UserModel = (mongoose) => {
    return mongoose.model(_collectionName.Users, userSchema)
}

const User = mongoose.model(_collectionName.Users, userSchema)
module.exports = { User, UserModel }