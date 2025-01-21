

const { _collectionName } = require("@src/v1/utils/constants");
const { _commonKeys } = require("@src/v1/utils/helpers/collection");
const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema({

    trackOrder_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.TrackOrder },
    truckNo: { type: String },
    final_pickup_batch: [
        {
            associate_batch_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Batch }, 
            batchId : { type : String } , 
            receving_date: { type: Date, default: Date.now },
            allotedQty: {
                count: { type: Number },
                unit: { type: String },
            },
            noOfBagsAlloted : { type : Number } ,
            no_of_bags: { type: Number },
        }
    ],
    truck_capacity: { type: Number },
    logistics_details: {
        logistics_company: { type: String },
        tracking_id: { type: String },
        tracking_link: { type: String },
    },
    driver_details: {
        name: { type: String },
        contact: { type: String },
        aadhar_number: { type: String },
        license_number: { type: String },
        license_img: { type: String },
    },
    vehicle_details: {
        loaded_vehicle_weight: { type: String },
        vehicle_weight: { type: String },
        vehicle_number: { type: String },
        vehicle_img: { type: String },
    },
    ..._commonKeys,
}, {
    timestamps: true,
})



truckSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    const Truck = mongoose.model(_collectionName.Truck, truckSchema);
    try {
        const lastTruck = await Truck.findOne().sort({ createdAt: -1 });
        let nextTruckCode = 'TR00001';
        if (lastTruck && lastTruck.truckNo) {
            const lastTruckNumber = parseInt(lastTruck.truckNo.slice(2));
            nextTruckCode = 'TR' + String(lastTruckNumber + 1).padStart(5, '0');
        }
        this.truckNo = nextTruckCode;
        next();
    } catch (err) {
        next(err);
    }
});

const Truck = mongoose.model(_collectionName.Truck, truckSchema);
module.exports = { Truck }; 