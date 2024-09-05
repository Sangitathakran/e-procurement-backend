const mongoose = require('mongoose');
const { _collectionName } = require('@src/v1/utils/constants');


const associateOrdersSchema = new mongoose.Schema({
    associate_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementRequest, required: true },
    batchId: { type: String, trim: true, },
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.CollectionCenter },
    dispatched_at: { type: Date },
    delivery_at: { type: Date },
    dispatchedqty: { type: Number },
    dispatched: {
        material_img: [{ type: String, required: true }],
        weight_slip: { type: String, trim: true },
        qc_report: { type: String, trim: true },
        lab_report: { type: String, trim: true },
    },
    intransit: {
        driver: {
            name: { type: String, trim: true },
            contact: { type: String, trim: true },
            license: { type: String, trim: true },
            aadhar: { type: String, trim: true },
        },
        transport: {
            service_name: { type: String, trim: true },
            vehicleNo: { type: String, trim: true },
            vehicle_weight: { type: String, trim: true },
            loaded_weight: { type: String, trim: true },
        },
        no_of_bags: { type: Number, trim: true },
        qty: { type: Number, trim: true },
        bill: { type: String, trim: true },
    },
    delivered: {},
    status: { type: String, enum: ["pending", "dispatched", "in-transit", "delivered"], default: "pending" }
}, { timestamps: true });

const AssociateOrders = mongoose.model(_collectionName.AssociateOrders, associateOrdersSchema);

module.exports = { AssociateOrders };

