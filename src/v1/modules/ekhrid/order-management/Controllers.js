const { _handleCatchErrors, handleDecimal } = require("@src/v1/utils/helpers");
const { farmerOrderList } = require("../../associate/request/Controller");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _procuredStatus, _associateOfferStatus, _paymentApproval, _batchStatus } = require("@src/v1/utils/constants");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require('mongoose');


module.exports.getFarmerOrders = async (req, res) => {
    try {

        const { req_id, seller_id } = req.body;

        const associateOfferIds = (await AssociateOffers.find({ req_id: new mongoose.Types.ObjectId(req_id), seller_id: new mongoose.Types.ObjectId(seller_id) })).map(i => i._id);

        let query = { associateOffers_id: { $in: associateOfferIds }, status: "Received" };

        const farmerOrders = await FarmerOrders.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: "farmers",
                    localField: "farmer_id",
                    foreignField: "_id",
                    as: "farmerDetails"
                }
            },

            {
                $lookup: {
                    from: "ekharidprocurements",
                    let: { externalFarmerId: "$farmerDetails.external_farmer_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$farmerID", "$$externalFarmerId"] } } }
                    ],
                    as: "procurementDetails"
                }
            },

            {
                $group: {
                    _id: 1,
                    req_id: { $first: req_id }, // Include req_id
                    seller_id: { $first: seller_id }, // Include seller_id
                    truck_capacity: { $first: 301 }, // Static truck_capacity value
                    farmerData: {
                        $push: {
                            farmerOrder_id: "$_id",
                            qty: "$offeredQty",
                        }
                    },
                    count: { $sum: 1 } // Count number of farmerData                    
                }
            }
        ]);

        return res.status(200).json({ status: 200, data: farmerOrders });

    } catch (error) {
        console.error("Error fetching farmer orders:", error);
        return res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
}

module.exports.createOrder = async (req, res) => {
    try {
        const { id, proof_of_delivery, weigh_bridge_slip, receiving_copy, truck_photo, loaded_vehicle_weight, tare_weight,
             net_weight, material_image = [], weight_slip = [], qc_report = [], data, paymentIsApprove = 0 } = req.body;
        const { user_id, user_type } = req;

        const record = await Batch.findOne({ _id: id }).populate("req_id").populate("seller_id");

        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
        }

        if (qc_report.length > 0 && material_image.length > 0 && data) {
            record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
            record.dispatched.qc_report.received_qc_status = received_qc_status.rejected;
            record.reason = { text: data, on: moment() }

        } else if (qc_report.length > 0 || material_image.length > 0) {
            if (material_image.length > 0) {
                record.dispatched.material_img.received.push(...material_image.map(i => { return { img: i, on: moment() } }))
            }
            if (qc_report.length > 0) {
                record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
                record.dispatched.qc_report.received_qc_status = received_qc_status.accepted;

                const { farmerOrderIds } = record;
                const paymentRecords = [];

                const request = await RequestModel.findOne({ _id: record?.req_id });
                for (let farmer of farmerOrderIds) {
                    const farmerData = await FarmerOrders.findOne({ _id: farmer?.farmerOrder_id });

                    const paymentData = {
                        req_id: request?._id,
                        farmer_id: farmerData.farmer_id,
                        farmer_order_id: farmer.farmerOrder_id,
                        associate_id: record?.seller_id,
                        ho_id: request?.head_office_id,
                        bo_id: request?.branch_id,
                        associateOffers_id: farmerData?.associateOffers_id,
                        batch_id: record?._id,
                        qtyProcured: farmer.qty,
                        amount: farmer.amt,
                        initiated_at: new Date(),
                        payment_method: _paymentmethod.bank_transfer
                    }

                    paymentRecords.push(paymentData);
                }

                await Payment.insertMany(paymentRecords);

                record.delivered.proof_of_delivery = proof_of_delivery;
                record.delivered.weigh_bridge_slip = weigh_bridge_slip;
                record.delivered.receiving_copy = receiving_copy;
                record.delivered.truck_photo = truck_photo;
                record.delivered.loaded_vehicle_weight = loaded_vehicle_weight;
                record.delivered.tare_weight = tare_weight;
                record.delivered.net_weight = net_weight;
                record.delivered.delivered_at = new Date();
                record.delivered.delivered_by = user_id;

                record.status = _batchStatus.delivered;

            }
        } else if (weight_slip.length > 0) {
            record.dispatched.weight_slip.received.push(...weight_slip.map(i => { return { img: i, on: moment() } }))
        } else if (proof_of_delivery && weigh_bridge_slip && receiving_copy && truck_photo && loaded_vehicle_weight && tare_weight && net_weight) {

            if (record.status != _batchStatus.intransit) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "batch should be intransit Please wait!!" }] }));
            }
            if (!record.dispatched) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "batch should be intransit Please wait!!" }] }));
            }

            if (!record.intransit) {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "batch should be intransit Please wait!!" }] }));
            }
            record.delivered.proof_of_delivery = proof_of_delivery;
            record.delivered.weigh_bridge_slip = weigh_bridge_slip;
            record.delivered.receiving_copy = receiving_copy;
            record.delivered.truck_photo = truck_photo;
            record.delivered.loaded_vehicle_weight = loaded_vehicle_weight;
            record.delivered.tare_weight = tare_weight;
            record.delivered.net_weight = net_weight;
            record.delivered.delivered_at = new Date();
            record.delivered.delivered_by = user_id;

            record.status = _batchStatus.delivered;

        } else if (paymentIsApprove == 1 && record.dispatched.qc_report.received.length > 0 && record.dispatched.qc_report.received_qc_status == received_qc_status.accepted) {
            record.payement_approval_at = new Date();
            record.payment_approve_by = user_id;
        }
        else {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
        }

        await record.save();

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: record,
                message: _response_message.created("batch"),
            })
        );

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
