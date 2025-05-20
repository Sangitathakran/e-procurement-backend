

const { _collectionName, _procuredStatus, _paymentstatus } = require('@src/v1/utils/constants');
const { _generateOrderNumber } = require('@src/v1/utils/helpers');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const farmerOrderSchema = new mongoose.Schema({
    associateOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, required: true, index: true },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true, index: true },
    metaData: { type: Object, required: true },
    offeredQty: { type: Number, required: true },
    order_no: { type: String, required: false, trim: true, index: true },
    receving_date: { type: Date },
    qtyProcured: { type: Number },
    qtyRemaining: { type: Number, default: 0 },
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementCenter },
    weighbridge_name: { type: String, trim: true },
    weighbridge_no: { type: Number },

    weighbridge_document: { type: String },
    subStandard: { type: String },
    no_of_bags: { type: Number, default: 0  },
    type_of_bags: { type: String },

    tare_weight: { type: Number },
    gross_weight: { type: Number },
    net_weight: { type: Number },
    weight_slip: { type: String },
    payment_date: { type: Date },
    payment_status: { type: String, enum: Object.values(_paymentstatus), default: "Pending" },
    net_pay: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(_procuredStatus), default: _procuredStatus.pending },
    batchCreatedAt:{ type: Date },
    gatePassID: { type: Number },
    exitGatePassId: { type: Number },
    ekhrid:{ type: Boolean, default: false },
    ekhridPaymentDetails:{type: Object,  default: null},
    ..._commonKeys
}, { timestamps: true });


const FarmerOrders = mongoose.model(_collectionName.FarmerOrder, farmerOrderSchema);

module.exports = { FarmerOrders };