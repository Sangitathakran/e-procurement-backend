const { _handleCatchErrors,  } = require("@src/v1/utils/helpers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const {  _batchStatus, received_qc_status, _paymentmethod,_paymentApproval } = require("@src/v1/utils/constants");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Payment } = require("@src/v1/models/app/procurement/Payment")

module.exports.getBatches = async (req, res) => {
    try {
        const { req_id, seller_id } = req.body;

        let query = {};
        query.ekhrid_payment = null
        if (req_id) query.req_id = req_id;
        if (seller_id) query.seller_id = seller_id;

        const record={count:0, data:[]}
         record.data = (await Batch.find(query).select("_id").lean()).map(({ _id }) => _id);
         record.count = record.data.length;
        return res.status(200).json({ status: 200, data: record, message: "Batches fetched successfully" });

    } catch (error) {
        console.error("Error fetching batches:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};


const mongoose = require("mongoose");


module.exports.batchMarkDelivered = async (req, res) => {
    try {
        const { batchIds, quantity_received, no_of_bags, bag_weight_per_kg, truck_photo, vehicle_details = {}, document_pictures = {}, weight_slip = [], user_id } = req.body;
        
        if (!Array.isArray(batchIds) || batchIds.length === 0) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Batch IDs must be an array with at least one ID." }));
        }
        
        const batches = await Batch.find({ _id: { $in: batchIds } }).populate("req_id").populate("seller_id");
        if (!batches.length) {
            return res.status(404).send(new serviceResponse({ status: 404, message: "No matching batches found." }));
        }
        
        const paymentUpdates = [];
        for (let record of batches) {
            record.dispatched.qc_report["received_qc_status"] = received_qc_status.accepted;
            
            const request = record.req_id;
            const farmerOrders = await FarmerOrders.find({ _id: { $in: record.farmerOrderIds.map(f => f.farmerOrder_id) } });
            
            for (let farmer of record.farmerOrderIds) {
                const farmerData = farmerOrders.find(f => f._id.equals(farmer.farmerOrder_id));
                if (!farmerData) continue;
                
                const paymentData = {
                    req_id: request?._id,
                    sla_id: request?.sla_id,
                    farmer_id: farmerData.farmer_id,
                    farmer_order_id: farmer?.farmerOrder_id,
                    associate_id: record.seller_id,
                    ho_id: request?.head_office_id,
                    bo_id: request?.branch_id,
                    associateOffers_id: farmerData?.associateOffers_id,
                    batch_id: record._id,
                    qtyProcured: farmer.qty,
                    amount: farmer.amt,
                    initiated_at: new Date(),
                    payment_method: _paymentmethod.bank_transfer,
                    ekhrid_payment: true,
                    bo_approve_status: _paymentApproval.approved,
                    bo_approve_by: request?.branch_id,
                    bo_approve_at: new Date(),
                    ho_approve_status: _paymentApproval.approved,
                    ho_approve_at: new Date(),
                    ho_approve_by: request?.head_office_id,
                    sla_approve_status: _paymentApproval.approved,
                    sla_approve_by: request?.sla_id,
                    sla_approve_at: new Date(),
                };
                
                paymentUpdates.push(
                    Payment.findOneAndUpdate(
                        { batch_id: record._id, farmer_id: farmerData.farmer_id },
                        { $set: paymentData },
                        { upsert: true, new: true }
                    )
                );
            }

            record.delivered = {
                proof_of_delivery: document_pictures.proof_of_delivery,
                weigh_bridge_slip: document_pictures.weigh_bridge_slip,
                receiving_copy: document_pictures.receiving_copy,
                truck_photo,
                loaded_vehicle_weight: vehicle_details.loaded_vehicle_weight,
                tare_weight: vehicle_details.tare_weight,
                net_weight: vehicle_details.net_weight,
                delivered_at: new Date(),
                delivered_by: user_id
            };
            record.status = _batchStatus.delivered;
            if (weight_slip.length > 0) {
                record.dispatched.weight_slip.received.push(...weight_slip.map(i => ({ img: i, on: moment() })));
            }
        }

        await Promise.all([...batches.map(b => b.save()), ...paymentUpdates]);
        
        await Batch.updateMany(
            { _id: { $in: batchIds } },
            {
                $set: {
                    'receiving_details.quantity_received': quantity_received,
                    'receiving_details.no_of_bags': no_of_bags,
                    'receiving_details.bag_weight_per_kg': bag_weight_per_kg,
                    'receiving_details.truck_photo': truck_photo,
                    'receiving_details.vehicle_details': vehicle_details,
                    'receiving_details.document_pictures': document_pictures,
                    wareHouse_approve_status: 'Received',
                    ekhrid_payment: new Date()
                }
            }
        );

        return res.status(200).send(new serviceResponse({
            status: 200,
            message: 'Batches updated successfully.',
            data: batchIds
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};





