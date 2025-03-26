

const { _collectionName } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: false },
    apiKey: { type: String, unique: true, required: true },
    apiSecret: { type: String, required: true },
    role: { type: String, enum: ["admin", "user", "partner"], default: "user" },
    permissions: { type: [String], default: ["read", "write"] },
    apiUsageLimit: { type: Number, default: 1000 }, 
    apiRequestsCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    failedAttempts: { type: Number, default: 0 },
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
}, {
    timestamps: true,
})



ClientSchema.pre("save", async function (next) {
    if (!this.isModified("apiSecret")) return next();
    const salt = await bcrypt.genSalt(10);
    this.apiSecret = await bcrypt.hash(this.apiSecret, salt);
    next();
});

ClientSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

const ClientToken = mongoose.model(_collectionName.ClientToken, ClientSchema);
module.exports = { ClientToken }; 