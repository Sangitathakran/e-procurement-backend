const { _collectionName } = require('@src/v1/utils/constants');
const { _commonKeys } = require('@src/v1/utils/helpers/collection');
const mongoose = require('mongoose');


const contributedFarmersSchema = new mongoose.Schema({
    sellerOffers_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.SellerOffers, required: true },
    farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.farmers, required: true },
    metaData: { type: Object, required: true },
    offeredQty: { type: Number, required: true },
    order_no: { type: String, required: true, trim: true },
    receving_date: { type: Date },
    qtyProcured: { type: Number },
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.CollectionCenter },
    weighbridge_name: { type: String, trim: true },
    weighbridge_no: { type: Number },
    tare_weight: { type: Number },
    gross_weight: { type: Number },
    net_weight: { type: Number },
    weight_slip: { type: String },
    status: { type: String, enum: ["Received", "Reject", "Pending"], default: "Pending" },
    ..._commonKeys
}, { timestamps: true });

contributedFarmersSchema.pre('save', async function (next) {
    const order = this;

    if (order.isNew) {
        let uniqueOrderNo;
        let isUnique = false;

        while (!isUnique) {
            uniqueOrderNo = Math.floor(10000000 + Math.random() * 90000000).toString();
            const existingOrder = await Order.findOne({ orderNo: uniqueOrderNo });
            if (!existingOrder) {
                isUnique = true;
            }
        }

        order.order_no = uniqueOrderNo;
    }

    next();
});

const contributedFarmers = mongoose.model(_collectionName.ContributedFarmers, contributedFarmersSchema);

module.exports = { contributedFarmers };