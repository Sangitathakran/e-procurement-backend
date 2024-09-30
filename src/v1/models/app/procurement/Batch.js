const mongoose = require('mongoose');
const { _collectionName, _batchStatus } = require('@src/v1/utils/constants');

const batchsSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    associateOffer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, required: true },
    batchId: { type: String, trim: true, },
    farmerOrderIds: [{ farmerOrder_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.FarmerOrder, required: true }, qty: { type: Number, default: 0 } }],
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementCenter },
    dispatched_at: { type: Date },
    delivery_at: { type: Date },
    dispatchedqty: { type: Number },
    dispatched: {
        material_img: [{ type: String, required: true }],
        weight_slip: { type: String, trim: true },
        bills: {
            qc_survey: {
                quantity: { type: Number, trim: true },
                bills: [{ type: String, trim: true }],
                total: { type: Number, trim: true },
            },
            gunny_bags: {
                quantity: { type: Number, trim: true },
                bills: [{ type: String, trim: true }],
                total: { type: Number, trim: true },
            },
            weighing_stiching: {
                quantity: { type: Number, trim: true },
                bills: [{ type: String, trim: true }],
                total: { type: Number, trim: true },
            },
            loading_unloading: {
                quantity: { type: Number, trim: true },
                bills: [{ type: String, trim: true }],
                total: { type: Number, trim: true },
            },
            transportation: {
                quantity: { type: Number, trim: true },
                bills: [{ type: String, trim: true }],
                total: { type: Number, trim: true },
            },
            driage: {
                quantity: { type: Number, trim: true },
                bills: [{ type: String, trim: true }],
                total: { type: Number, trim: true },
            }
        },
        qc_report: { type: String, trim: true },
        lab_report: { type: String, trim: true },
        dispatched_at: { type: Date },
        dispatched_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
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
            vehicle_weight: { type: Number, trim: true },
            loaded_weight: { type: Number, trim: true },
            gst_number: { type: String, trim: true },
            pan_number: { type: String, trim: true },
        },
        weight_slip: { type: String, trim: true },
        no_of_bags: { type: Number, trim: true },
        weight: { type: Number, trim: true },
        intransit_at: { type: Date },
        intransit_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },

    },
    delivered: {
        proof_of_delivery: { type: String, trim: true },
        weigh_bridge_slip: { type: String, trim: true },
        receiving_copy: { type: String, trim: true },
        truck_photo: { type: String, trim: true },
        details: {
            loaded_vehicle_weight: { type: Number, trim: true },
            tare_weight: { type: Number, trim: true },
            net_weight: { type: Number, trim: true },
            delivered_on: { type: Date, trim: true },
        },
    },
    delivered_at: { type: Date },
    delivered_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users },
    status: { type: String, enum: Object.values(_batchStatus), default: _batchStatus.pending }
}, { timestamps: true });

const Batch = mongoose.model(_collectionName.Batch, batchsSchema);

module.exports = { Batch };

