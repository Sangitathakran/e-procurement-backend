
const { _collectionName } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");
const mongoose = require("mongoose");


const trackOrderSchema = new mongoose.Schema({

    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.BatchOrderProcess },
    purchaseOrder_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.PurchaseOrder, required: true },
    ready_to_ship: {
        status: { type: String, default: "Pending" },
        pickup_batch: [
            {
                associate_batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch }, 
                batchId : { type : String } ,
                availableQty: {
                    count: { type: Number },
                    unit: { type: String },
                },
                receving_date: { type: Date, default: Date.now },
                qtyAllotment: { type: Number },
                totalBags : { type : Number } ,
                no_of_bags: { type: Number },
            }
        ],
        marked_ready : { type : Boolean , default : false } ,
        date : { type : Date , default : Date.now } , 
    },
    in_transit: {
        status: { type: String, default: "Pending" },
        truck_id: [{ type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Truck }], 
        date : { type : Date , default : Date.now}
    },
    ..._commonKeys
},
    {
        timestamps: true,
    })

const TrackOrder = mongoose.model(_collectionName.TrackOrder, trackOrderSchema);

module.exports = { TrackOrder };