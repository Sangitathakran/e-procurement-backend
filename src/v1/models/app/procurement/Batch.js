const mongoose = require('mongoose');
const { _collectionName, _batchStatus,_whr_status, received_qc_status, _paymentApproval, _billstatus, _wareHouseApproval } = require('@src/v1/utils/constants');

const batchsSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Users, required: true },
    req_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Request, required: true },
    associateOffer_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.AssociateOffers, required: true },
    warehousedetails_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.WarehouseDetails },
    batchId: { type: String, trim: true,unique:true},
    farmerOrderIds: [{ 
        farmerOrder_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.FarmerOrder, required: true }, 
        qty: { type: Number, default: 0 }, 
        amt: { type: Number, default: 0 },
        rejected_quantity : { type: Number, default: 0 }, 
        rejected_bags : { type: Number, default: 0 }, 
        gain_quantity : { type: Number, default: 0 }, 
        gain_bags : { type: Number, default: 0 }, 
        accepted_quantity : { type: Number, default: 0 }, 
        accepted_bags : { type: Number, default: 0 }, 
        dispatch_quantity : { type: Number, default: 0 }, 
        dispatch_bags : { type: Number, default: 0 }, 
        whr_document : { type: String },
    }],
    procurementCenter_id: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.ProcurementCenter },
    qty: { type: Number, default: 0 },
    available_qty : { type : Number , default: 0 } , 
    allotedQty : { type : Number , default : 0 } ,
    goodsPrice: { type: Number, trim: true },
    totalPrice: { type: Number, trim: true },
    dispatched: {
        material_img: {
            inital: [{ img: { type: String, required: true }, on: { type: Date } }],
            received: [{ img: { type: String, required: true }, on: { type: Date } }],
        },
        weight_slip: {
            inital: [{ img: { type: String, required: true }, on: { type: Date } }],
            received: [{ img: { type: String, required: true }, on: { type: Date } }],
        },
        bills: {
            procurementExp: { type: Number, trim: true },
            qc_survey: [{ type: String, trim: true }],
            gunny_bags: [{ type: String, trim: true }],
            weighing_stiching: [{ type: String, trim: true }],
            loading_unloading: [{ type: String, trim: true }],
            transportation: [{ type: String, trim: true }],
            driage: { type: Number, trim: true },
            storageExp: { type: Number, trim: true },
            commission: { type: Number, trim: true },
            total: { type: Number, trim: true }

        },
        qc_report: {
            inital: [{ img: { type: String, required: true }, on: { type: Date } }],
            received: [{ img: { type: String, required: true }, on: { type: Date } }],
            received_qc_status: { type: String, enum: Object.values(received_qc_status), defualt: received_qc_status.pending },
        },
        lab_report: {
            inital: [{ img: { type: String, required: true }, on: { type: Date } }],
            received: [{ img: { type: String, required: true }, on: { type: Date } }],
        },
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
        licenseImg: { type: String, trim: true },
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
        loaded_vehicle_weight: { type: Number, trim: true },
        tare_weight: { type: Number, trim: true },
        net_weight: { type: Number, trim: true },
        delivered_at: { type: Date, trim: true },
        delivered_by: { type: mongoose.Schema.Types.ObjectId, ref: _collectionName.Branch },
    },
    final_quality_check: {
        product_images: [{ type: String, trim: true, }],
        qc_images: { type: String, trim: true, },
        whr_receipt: { type: String, trim: true },
        whr_receipt_image: { type: String, trim: true },
        status: { type: String, trim: true, default: "Pending" },
        rejected_reason: { type: String, trim: true },
    },
    receiving_details: {
        quantity_received: { type: String, trim: true },
        no_of_bags: { type: String, trim: true },
        bag_weight_per_kg: { type: String, trim: true },
        truck_photo: { type: String, trim: true },
        vehicle_details: {
            loaded_vehicle_weight: { type: Number, trim: true },
            tare_weight: { type: Number, trim: true },
            net_weight: { type: Number, trim: true },
        },
        document_pictures: {
            product_images: [{ type: String, trim: true, }],
            weigh_bridge_slip: { type: String, trim: true },
            receiving_copy: { type: String, trim: true },
            proof_of_delivery: { type: String, trim: true },
            truck_photo: { type: String, trim: true },
        },
        received_on: { type: Date, default: Date.now, }
    },
    reason: { text: { type: String }, on: { type: Date } },
    bo_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    payement_approval_at: { type: Date, default: null },
    payment_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    ho_approval_at: { type: Date, default: null },
    ho_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    ho_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    payment_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    payment_at: { type: Date, default: null },
    status: { type: String, enum: Object.values(_batchStatus), default: _batchStatus.pending },
    agent_approve_status: { type: String, enum: Object.values(_paymentApproval), default: _paymentApproval.pending },
    agent_approve_at: { type: Date, default: null },
    agent_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    wareHouse_approve_status: { type: String, enum: Object.values(_wareHouseApproval), default: _wareHouseApproval.pending },
    wareHouse_approve_at: { type: Date, default: null },
    wareHouse_approve_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    ekhridBatch: { type: Boolean, default: false },
    gatePassId: { type: Number, default: null },
    ekhrid_payment: { type: Date, default: null },
    warehouseUpdatedAt: { type: Date, default: null },

    source_by: { type: String, default: "NCCF" },
    
    whr_status: { type: String, enum: Object.values(_whr_status), default: _whr_status.pending }, 
}, { timestamps: true });

const Batch = mongoose.model(_collectionName.Batch, batchsSchema);

module.exports = { Batch };
