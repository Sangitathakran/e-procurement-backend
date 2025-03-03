const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { _batchStatus, received_qc_status, _paymentstatus, _paymentmethod, _userType } = require("@src/v1/utils/constants");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const moment = require("moment");
const { dumpJSONToExcel } = require("@src/v1/utils/helpers");
const mongoose = require('mongoose');

module.exports.getRequirements = asyncErrorHandler(async (req, res) => {
    const { user_id, portalId } = req;
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = "createdAt", search = "", isExport = 0 } = req.query;

    let matchQuery = {
        branch_id: { $in: [new mongoose.Types.ObjectId(user_id), new mongoose.Types.ObjectId(portalId)] },
    };

    
    let aggregationPipeline = [
        { $match: matchQuery },
        // lookup for product details
        {
            $lookup: {
                from: "schemes", 
                localField: "product.schemeId",
                foreignField: "_id",
                //pipeline : [{ $project: { schemeId:1, schemeName: 1} }],
                as: "product.schemeId"
            }
        },
        {
            $unwind: { path: "$product.schemeId", preserveNullAndEmptyArrays: true }
        },

        // Lookup for branch details
        {
            $lookup: {
                from: "branches",
                localField: "branch_id",
                foreignField: "_id",
                pipeline: [{ $project: { branchName: 1, branchId: 1}}],
                as: "branch_id",
            },
        },
        { $unwind: { path: "$branch_id", preserveNullAndEmptyArrays: true } },

        // Lookup for head office details
        {
            $lookup: {
                from: "headoffices",
                localField: "head_office_id",
                foreignField: "_id",
                pipeline: [{ $project: { company_details: 1}}],
                as: "head_office_id",
            },
        },
        { $unwind: { path: "$head_office_id", preserveNullAndEmptyArrays: true } },


        // Lookup for SLA details
        {
            $lookup: {
                from: "slas",
                localField: "sla_id",
                foreignField: "_id",
                pipeline: [{ $project: { basic_details: 1}}],
                as: "sla_id",
            },
        },
        { $unwind: { path: "$sla_id", preserveNullAndEmptyArrays: true } },

        // Add schemeName field before filtering
      {
        $addFields: {
          schemeName: {
            $concat: [
              "$product.schemeId.schemeName",
              " ",
              { $ifNull: ["$product.name", ""] },
              " ",
              { $ifNull: ["$product.schemeId.season", ""] },
              " ",
              { $ifNull: ["$product.schemeId.period", ""] },
            ],
          },
        },
      },

    ];


    if (search?.trim()) {
        aggregationPipeline.push({
          $match: {
            $or: [
              { reqNo: { $regex: search, $options: "i" } },
              { "product.name": { $regex: search, $options: "i" } },
              { schemeName: { $regex: search, $options: "i"} }
            ],
          },
        });
      }
  
  

    aggregationPipeline.push(
         // Add necessary fields
         {
            $project: {
                reqNo: 1,
                product: 1,
                schemeName: 1,
                quotedPrice: 1,
                createdAt: 1,
                expectedProcurementDate: 1,
                deliveryDate: 1,
                address: 1,
                branch_id:1,
                head_office_id: 1,
                sla_id: 1,
            },
        },
    );

    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy]: -1 } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy]: -1 } });
    }

    const rows = await RequestModel.aggregate(aggregationPipeline);

    // Count Query
    const countPipeline = [...aggregationPipeline.slice(0, -1), { $count: "total" }];
    const countResult = await RequestModel.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    const records = { rows, count };

    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit !== 0 ? Math.ceil(count / limit) : 0;
    }

    if (isExport == 1) {
        const record = rows.map((item) => ({
            "Order ID": item.reqNo || "NA",
            "Commodity": item["product.name"] || "NA",
            "Quantity": item["product.quantity"] || "NA",
            "MSP": item.quotedPrice || "NA",
            "Created On": item.createdAt || "NA",
            "Expected Procurement": item.expectedProcurementDate || "NA",
            "Expected Delivery Date": item.deliveryDate || "NA",
            "Delivery Location": item["address.deliveryLocation"] || "NA",
        }));

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: Requirement-record.xlsx,
                worksheetName: Requirement-record,
            });
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("requirement") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));
    }
});



module.exports.getBatchByReq = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query;

    let matchQuery = { req_id: new mongoose.Types.ObjectId(req_id) };

    let aggregationPipeline = [
        { $match: matchQuery },

        // Lookup seller details
        {
            $lookup: {
                from: "users", 
                localField: "seller_id",
                foreignField: "_id",
                pipeline : [
                    { $project : { "basic_details.associate_details.organization_name":1, "basic_details.associate_details.associate_name": 1 } }
                ],
        
                as: "seller_id",
            },
        },
        { $unwind: { path: "$seller_id", preserveNullAndEmptyArrays: true } },

        // Lookup procurement center details
        {
            $lookup: {
                from: "procurementcenters", 
                localField: "procurementCenter_id",
                foreignField: "_id",
                pipeline: [
                    { $project: { center_name: 1}}
                ],
                as: "procurementCenter_id",
            },
        },
        { $unwind: { path: "$procurementCenter_id", preserveNullAndEmptyArrays: true } },

        // Lookup request details
        {
            $lookup: {
                from: "requests", 
                localField: "req_id",
                foreignField: "_id",
                pipeline : [
                    { $project : { "address.deliveryLocation":1 } }
                ],
                as: "req_id",
            },
        },
        { $unwind: { path: "$req_id", preserveNullAndEmptyArrays: true } },

        // Add  searchable fields
        {
            $addFields: {
                associateName: "$seller_id.basic_details.associate_details.associate_name",
                procurementCenterName: "$procurementCenter_id.center_name",
                deliveryLocation: "$req_id.address.deliveryLocation",
            },
        },
    ];

    // Apply search filter
    if (search.trim()) {
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const searchTerm = escapeRegex(search.trim());

        aggregationPipeline.push({
            $match: {
                $or: [
                    { batchId: { $regex: searchTerm, $options: "i" } },
                    { associateName: { $regex: searchTerm, $options: "i" } },
                    { procurementCenterName: { $regex: searchTerm, $options: "i" } },
                   // { deliveryLocation: { $regex: searchTerm, $options: "i" } },
                ],
            },
        });
    }

    // Final projection
    aggregationPipeline.push({
        $project: {
            _id: 1,
            batchId: 1,
            associateName: 1,
            procurementCenterName: 1,
            qty: 1,
            delivered_at: "$delivered.delivered_at",
            status: 1,
            dispatched: 1,
            intransit: 1,
            delivered: 1,
            final_quality_check: 1,
            receiving_details: 1,
            seller_id: 1,
            procurementCenter_id:1,
            req_id: 1,
            farmerOrderIds:1,
            qty: 1,
            goodsPrice: 1,
            totalPrice: 1,
            bo_approve_status: 1,
            payement_approval_at: 1,
            payment_approve_by: 1,
            ho_approval_at: 1,
            ho_approve_by: 1,
            ho_approve_status: 1,
            payment_by: 1,
            payment_at: 1,
            status: 1,
            agent_approve_status: 1,
            warehousedetails_id: 1,
            wareHouse_approve_at: 1,
            wareHouse_approve_status: 1,
            allotedQty: 1,
            available_qty: 1,
            createdAt: 1,
            updatedAt: 1
        }
    });
    
    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || "createdAt"]: -1, _id: -1 } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || "createdAt"]: -1, _id: -1 } });
    }

    const rows = await Batch.aggregate(aggregationPipeline);

    // Count Query
    const countPipeline = [...aggregationPipeline.slice(0, -1), { $count: "total" }];
    const countResult = await Batch.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;

    const records = { rows, count };

    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit !== 0 ? Math.ceil(count / limit) : 0;
    }

    if (isExport == 1) {
        const record = rows.map((item) => ({
            "Batch ID": item?.batchId || "NA",
            "Associate Name": item?.associateName || "NA",
            "Procurement Center": item?.procurementCenterName || "NA",
            "Quantity Procured": item?.qty || "NA",
            "Delivered On": item?.delivered_at ?? "NA",
            "Batch Status": item?.status ?? "NA",
        }));

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Requirement-Batch-record.xlsx`,
                worksheetName: `Requirement-Batch-record`,
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("requirement") }));
    }
});



module.exports.uploadRecevingStatus = asyncErrorHandler(async (req, res) => {

    const { id, proof_of_delivery, weigh_bridge_slip, receiving_copy, truck_photo, loaded_vehicle_weight, tare_weight, net_weight, material_image = [], weight_slip = [], qc_report = [], data, paymentIsApprove = 0 } = req.body;
    const { user_id, user_type } = req;

    const record = await Batch.findOne({ _id: id }).populate("req_id").populate("seller_id");

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
    }

    if (qc_report.length > 0 && material_image.length > 0 && data) {
        record.dispatched.qc_report.received.push(...qc_report.map(i => { return { img: i, on: moment() } }));
        record.dispatched.qc_report.received_qc_status = received_qc_status.rejected;
        record.reason = { text: data, on: moment() }

        const subject = `QC Rejected Notification for  Batch ID ${record?.batchId} under order ID ${record?.req_id.reqNo}`;
        const body = `<p>  Dear ${record?.seller_id?.basic_details.associate_details.associate_name}, </p> <br/>
        <p> This is to inform you that the Quality Control (QC) for the following batch has been rejected: </p> <br/> 
          <ul>
                <li> Order ID : ${record?.req_id.reqNo} </li>
                <li>Batch ID  : ${record?.batchId} </li>
                <li>Associate Name : ${record?.seller_id?.basic_details?.associate_details.associate_name}</li>
                <li> Commodity : ${record?.req_id.product.name} </li>
                <li>Quantity  : ${record?.req_id.product.quantity}</li> 
                <li> Rejection Reason: ${data} </li>
            </ul> <br/> 
        <p> Please follow the link below for additional information: </p> <br/> 
        <p> Needs Help </p> <br/> 
        <p> For queries or any assistance, contact us at ${record?.seller_id.basic_details.associate_details.phone} </p> <br/> 
        <p> Warm regards,  </p> <br/> 
        <p> Team Navankur. </p>`

        await sendMail("ashita@navankur.org", "", subject, body);

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

            const subject = `QC Approved Notification for Batch ID ${record?.batchId} under order ID ${record?.req_id.reqNo}`;
            const body = `<p>  Dear ${record?.seller_id?.basic_details.associate_details.associate_name}, </p> <br/>
            <p> This is to inform that you Quality Control (QC) for the following batch has been successfully approved:</p> <br/> 
             <ul>
                <li> Order ID : ${record?.req_id.reqNo} </li>
                <li>Batch ID  : ${record?.batchId} </li>
                <li>Associate Name : ${record?.seller_id?.basic_details.associate_details.associate_name}</li>
                <li> Commodity : ${record?.req_id.product.name} </li>
                <li>Quantity  : ${record?.req_id.product.quantity}</li>
            </ul> <br/> 
            <p> Please follow the link below for additional information: </p> <br/> 
            <p> Needs Help </p> <br/> 
            <p> For queries or any assistance, contact us at ${record?.seller_id?.basic_details.associate_details.phone} </p> <br/> 
            <p> Warm regards,  </p> <br/> 
            <p> Team Navankur. </p>`

            await sendMail("ashita@navankur.org", "", subject, body);
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

        const subject = `Confirmation of Successful Batch Delivery for ${record?.batchId} under ${record.req_id.reqNo}`;
        const body = `<p> Dear  ${record?.seller_id.basic_details.associate_details.associate_name}, </p> <br/>
            <p> This is to inform you that the batch has been successfully delivered. Below are the details for your records: </p> <br/> 
            <ul>
                <li> Order ID : ${record?.req_id.reqNo} </li>
                <li>Batch ID  : ${record?.batchId} </li>
                <li>Associate Name : ${record?.seller_id?.basic_details.associate_details.associate_name}</li>
                <li>Quantity Procured : ${record?.qty}</li>
                <li>Delivery Date : ${record?.delivered.delivered_at}</li>
            </ul>
            <br/>
            <p> Please follow the link below for additional information:< Insert Link> </p> <br/> 
            <p> Needs Help </p> <br/> 
            <p> For queries or any assistance, contact us at ${record?.seller_id?.basic_details.associate_details.phone} </p> <br/> 
            <p> Warm regards,  </p> <br/> 
            <p> Navankur. </p> `

        await sendMail("ashita@navankur.org", "", subject, body);

    } else if (paymentIsApprove == 1 && record.dispatched.qc_report.received.length > 0 && record.dispatched.qc_report.received_qc_status == received_qc_status.accepted) {
        record.payement_approval_at = new Date();
        record.payment_approve_by = user_id;
    }
    else {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require("field") }] }));
    }

    await record.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("Batch") }));

})


module.exports.getBatch = asyncErrorHandler(async (req, res) => {

    const { id } = req.params;

    let record = await Batch.findOne({ _id: id }).populate("req_id");

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }));
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Batch") }));
})

module.exports.getFarmerByBatchId = asyncErrorHandler(async (req, res) => {


    const { id } = req.params;

    const record = await Batch.findOne({ _id: id }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));

})


module.exports.auditTrail = asyncErrorHandler(async (req, res) => {

    const { id } = req.query;

    const record = await Batch.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
    }

    const { dispatched, intransit, delivered, createdAt, payment_at, payement_approval_at } = record;

    const steps = [
        {
            name: "Batch Created",
            status: record ? "completed" : "pending",
            date: record ? createdAt : null,
        },
        {
            name: "Mark Dispatched",
            status: dispatched ? "completed" : "pending",
            date: dispatched.dispatched_at ? dispatched.dispatched_at : null,
        },
        {
            name: "In Transit",
            status: intransit ? "completed" : "pending",
            date: intransit.intransit_at ? intransit.intransit_at : null,
        },
        {
            name: "Delivery Date",
            status: delivered ? "completed" : "pending",
            date: delivered.delivered_at ? delivered.delivered_at : null,
        },
        {
            name: "Final QC Check",
            status: dispatched.qc_report.received_qc_status == received_qc_status.accepted ? "completed" : dispatched.qc_report.received_qc_status == received_qc_status.rejected ? "rejected" : "pending",
            date: dispatched.qc_report.received.length != 0 && dispatched.qc_report.received[dispatched.qc_report.received.length - 1].on ? dispatched.qc_report.received[dispatched.qc_report.received.length - 1].on : null
        },
        {
            name: "Payment Approval Date",
            status: payement_approval_at ? "completed" : "pending",
            date: payement_approval_at ? payement_approval_at : null,
        },
        {
            name: "Payment Paid",
            status: payment_at ? "completed" : "pending",
            date: payment_at ? payment_at : null,
        },
    ];


    return res.status(200).send(new serviceResponse({ status: 200, data: steps, message: _response_message.found("audit trail") }))

})