

const { _collectionName, _procuredStatus } = require('@src/v1/utils/constants');
const { _generateOrderNumber } = require('@src/v1/utils/helpers');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const farmerOrderSchema = new mongoose.Schema({
    associateOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, required: true },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    metaData: { type: Object, required: true },
    offeredQty: { type: Number, required: true },
    order_no: { type: String, required: false, trim: true },
    receving_date: { type: Date },
    qtyProcured: { type: Number },
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementCenter },
    weighbridge_name: { type: String, trim: true },
    weighbridge_no: { type: Number },
    tare_weight: { type: Number },
    gross_weight: { type: Number },
    net_weight: { type: Number },
    weight_slip: { type: String },
    payment_date: { type: Date },
    payment_status: { type: String, enum: ["pending", "credited"], defualt: "pending" },
    net_pay: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(_procuredStatus), default: _procuredStatus.pending },
    ..._commonKeys
}, { timestamps: true });


const FarmerOrders = mongoose.model(_collectionName.FarmerOrder, farmerOrderSchema);

module.exports = { FarmerOrders };