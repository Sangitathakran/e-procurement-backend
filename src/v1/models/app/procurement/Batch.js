const mongoose = require('mongoose');
const { _collectionName, _batchStatus } = require('@src/v1/utils/constants');

const batchsSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    associateOffer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, required: true },
    batchId: { type: String, trim: true, },
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementCenter },
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
        bill: {
            qc_charges: { type: Number, trim: true }
        },
        no_of_bags: { type: Number, trim: true },
        qty: { type: Number, trim: true },
    },
    delivered: {},
    status: { type: String, enum: Object.values(_batchStatus), default: _batchStatus.pending }
}, { timestamps: true });

const Batch = mongoose.model(_collectionName.Batch, batchsSchema);

module.exports = { Batch };

