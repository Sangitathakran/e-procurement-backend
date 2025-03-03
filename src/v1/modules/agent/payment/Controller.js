const { _handleCatchErrors, dumpJSONToCSV, dumpJSONToExcel, handleDecimal, dumpJSONToPdf } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentApproval, _batchStatus, _associateOfferStatus, _paymentstatus } = require('@src/v1/utils/constants');
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const mongoose = require("mongoose");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { PaymentLogs } = require("@src/v1/models/app/procurement/PaymentLogs");
const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
const moment = require("moment");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
// const { AssociateInvoice } = require("@src/v1/models/app/payment/associateInvoice");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const { AssociateInvoice } = require("@src/v1/models/app/payment/associateInvoice");


module.exports.payment = async (req, res) => {
    try {
        let { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0,approve_status="Pending" } = req.query
        // limit = 5
        let query = search ? {
            $or: [
                { "reqNo": { $regex: search, $options: 'i' } },
                { "product.name": { $regex: search, $options: 'i' } },
            ]
        } : {};

        const { portalId, user_id } = req
        const paymentIds = (await Payment.find()).map(i => i.req_id)
       
        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds }, ...query } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'batches',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'batches',
                    pipeline: [{
                        $lookup: {
                            from: 'payments',
                            localField: '_id',
                            foreignField: 'batch_id',
                            as: 'payment',
                        }
                    }],
                }
            },
            {
                $lookup: {
                    from: 'branches',
                    localField: 'branch_id',
                    foreignField: '_id',
                    as: 'branchDetails'
                }
            },
            {
                $addFields: {
                    branchDetails: {
                        branchName: { $arrayElemAt: ['$branchDetails.branchName', 0] },
                        branchId: { $arrayElemAt: ['$branchDetails.branchId', 0] },
                    }
                }
            },
            {
                $lookup:{
                    from:"slas",
                    localField:"sla_id",
                    foreignField:"_id",
                    as:"sla"
                }
            },
            {
                $unwind:{path:"$sla",preserveNullAndEmptyArrays:true}
            },
            {
                $lookup:{
                    from:"slas",
                    localField:"sla_id",
                    foreignField:"_id",
                    as:"sla"
                }
            },
            {
                $unwind:{path:"$sla",preserveNullAndEmptyArrays:true}
            },
            {
                $lookup:{
                    from:"schemes",
                    localField:"product.schemeId",
                    foreignField:"_id",
                    as:"scheme"
                }
            },
            {
                $unwind:{path:"$scheme",preserveNullAndEmptyArrays:true}
            },
            {
                $match: {
                    batches: { $ne: [] },
                    "batches.bo_approve_status": approve_status==_paymentApproval.pending?_paymentApproval.pending:{ $ne: _paymentApproval.pending } 
                }
            },
            {
                $addFields: {
                    approval_status: {
                        $cond: {
                            if: {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $or: [
                                                { $not: { $ifNull: ['$$batch.bo_approval_at', true] } },  // Check if the field is missing
                                                { $eq: ['$$batch.bo_approval_at', null] },  // Check for null value
                                            ]
                                        }
                                    }
                                }
                            },
                            then: 'Pending',
                            else: 'Approved'
                        }
                    },
                    qtyPurchased: {
                        $reduce: {
                            input: '$batches',
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.qty'] }  // Sum of qty from batches
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: '$batches',
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.totalPrice'] }  // Sum of totalPrice from batches
                        }
                    },
                    payment_status: {
                        $cond: {
                            if: {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $anyElementTrue: {
                                                $map: {
                                                    input: '$$batch.payment',
                                                    as: 'pay',
                                                    in: {
                                                        $eq: ['$$pay.payment_status', 'Pending']  // Assuming status field exists in payments
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    'branchDetails.branchName':1,
                    'branchDetails.branchId':1,
                    'sla.basic_details.name':1,
                    'scheme.schemeName':1,
                    approval_status: 1,
                    qtyPurchased: 1,
                    amountPayable: 1,
                    payment_status: 1,
                  
                }
            },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) },
            
        ];
        let response={count:0}
        response.rows = await RequestModel.aggregate(aggregationPipeline);
         const countResult = await RequestModel.aggregate([...aggregationPipeline.slice(0, -2), { $count: "count" }]);
         response.count = countResult?.[0]?.count ?? 0;

      
         response.count = countResult?.[0]?.count ?? 0;
        ////////// start of Sangita code

        // response.rows = await Promise.all(records[0].data.map(async record => {

        //     allBatchApprovalStatus = _paymentApproval.pending;

        //     const pendingBatch = await Batch.find({ req_id: record._id, bo_approve_status: _paymentApproval.pending });

        //     if (pendingBatch.length > 0) {
        //         allBatchApprovalStatus = _paymentApproval.pending;
        //     } else {
        //         allBatchApprovalStatus = _paymentApproval.approved;
        //     }

        //     return { ...record, allBatchApprovalStatus }
        // }));

        ////////// end of Sangita code


        if (paginate == 1) {
            response.page = page
            response.limit = limit
            response.pages = limit != 0 ? Math.ceil(response.count / limit) : 0
        }

        if (isExport == 1) {
            const exportRecords = await RequestModel.aggregate([
                ...aggregationPipeline,
            ]);
            const record = exportRecords.map((item) => {
                const procurementAddress = item?.ProcurementCenter[0]?.address;
                const sellerDetails = item.sellers?.[0]?.basic_details?.associate_details || {};
                const farmerDetails = item.farmer ? item.farmer[0] || {} : {};
                const farmerAddress = item.farmer?.address
                    ? `${farmerDetails.address.village || "NA"}, ${farmerDetails.address.block || "NA"}, 
                       ${farmerDetails.address.country || "NA"}`
                    : "NA";
                return {
                    "Order ID": item?.reqNo || 'NA',
                    "Commodity": item?.product.name || 'NA',
                    "Quantity Purchased": item?.qtyPurchased || 'NA',
                    "Amount Payable": item?.amountPayable || 'NA',
                    "Approval Status": item?.approval_status ?? 'NA',
                    "Payment Status": item?.payment_status ?? 'NA',
                    "Associate User Code": item.sellers?.[0]?.user_code || "NA",
                    "Associate Name": sellerDetails?.associate_name || "NA",
                    "Farmer ID": farmerDetails?.farmer_id || "NA",
                    "Farmer Name": farmerDetails?.name || "NA",
                    "Mobile No": farmerDetails?.basic_details?.mobile_no || "NA",
                    "Farmer DOB": farmerDetails?.basic_details?.dob || "NA",
                    "Father Name": farmerDetails?.parents?.father_name || "NA",
                    "Farmer Address": farmerAddress,
                    "Collection center": item?.ProcurementCenter[0]?.center_name ?? "NA",
                    "Procurement Address Line 1": procurementAddress?.line1 || "NA",
                    "Procurement City": procurementAddress?.city || "NA",
                    "Procurement District": procurementAddress?.district || "NA",
                    "Procurement State": procurementAddress?.state || "NA",
                    "Procurement Country": procurementAddress?.country || "NA",
                    "Procurement Postal Code": procurementAddress?.postalCode || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Farmer-Payment-records.xlsx`,
                    worksheetName: `Farmer-Payment-records`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: response, message: _response_message.notFound("Payment") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: response, message: _response_message.found("Payment") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.associateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const paymentIds = (await Payment.find({ req_id })).map(i => i.associateOffers_id)

        let query = {
            _id: { $in: paymentIds },
            req_id,
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        console.log("query", query);

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        records.rows = paginate == 1 ? await AssociateOffers.find(query)
            .populate({
                path: "seller_id",
                select: "_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name"
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AssociateOffers.find(query)
                .populate({
                    path: "seller_id",
                    select: "_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name basic_details.associate_details.organization_name"
                })
                .sort(sortBy);

        records.count = await AssociateOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Associate Id": item?.seller_id.user_code || "NA",
                    "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
                    "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
                    "Quantity Purchased": item?.offeredQty || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
                    worksheetName: `Associate Orders-record-${'Associate Orders'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchList = async (req, res) => {

    
    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, isExport = 0,batch_status="Pending" } = req.query
        const { user_type, portalId, user_id } = req

        const paymentIds = (await Payment.find({ bo_id: { $in: [portalId, user_id] }, associateOffers_id: associateOffer_id })).map(i => i.batch_id)
        let query = {
            _id: { $in: paymentIds },
            associateOffer_id,
            bo_approve_status: batch_status==_paymentApproval.pending?_paymentApproval.pending:_paymentApproval.approved,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .sort(sortBy)
            .skip(skip)
            .select('_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_at payment_approve_by bo_approve_status')
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Batch ID": item?.batchId || 'NA',
                    "Delivey Date": item?.delivered.delivered_at || 'NA',
                    "Payment Due Date": item?.payment_at || 'NA',
                    "Quantity Purchased": item?.qty || 'NA',
                    "Amount Payable": item?.totalPrice || 'NA',
                    "Approval Status": item?.bo_approve_status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-Batch-records.xlsx`,
                    worksheetName: `Associate-Batch-records`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.notFound("Payment") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.lot_list = async (req, res) => {

    try {
        const { batch_id } = req.query;

        const record = {}
        record.rows = await Batch.findOne({ _id: batch_id }).select({ _id: 1, farmerOrderIds: 1 }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" });

        if (!record) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Batch") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

// TODO aggrigation on invoice after a record insert
module.exports.AssociateTabPaymentRequests = async (req, res) => {
    try {
        const { page, limit, skip, paginate = 1, sortBy, isExport = 0, search = '' } = req.query
        // let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};
        const paymentIds = (await AssociateInvoice.find({})).map(i => i.req_id);

        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds } } },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'invoice',
                }
            },
            {
                $lookup: {
                    from: "batches",
                    localField: "_id",
                    foreignField: "req_id",
                    as: "batches",
                    pipeline: [
                        {
                            $lookup: {
                                from: "payments",
                                localField: "_id",
                                foreignField: "batch_id",
                                as: "payment",
                            },
                        },
                    ],
                }
            },
            {
                $lookup: {
                    from: "farmers",
                    localField: "farmer_order_id",
                    foreignField: "farmer_order_id",
                    as: "farmer",
                },
            },
            {
                $addFields: {
                    farmer: {
                        FarmerName: { $arrayElemAt: ['$farmer.name', 0] },
                        FatherName: { $arrayElemAt: ['$farmer.parents.father_name', 0] },
                        FatherDOB: { $arrayElemAt: ['$farmer.basic_details.dob', 0] },
                        FarmerID: { $arrayElemAt: ['$farmer.farmer_id', 0] },
                        address: {
                            address_line_1: { $arrayElemAt: ['$farmer.address.address_line_1', 0] },
                            country: { $arrayElemAt: ['$farmer.address.country', 0] },
                            tahshil: { $arrayElemAt: ['$farmer.address.tahshil', 0] },
                            village: { $arrayElemAt: ['$farmer.address.village', 0] },
                            pin_code: { $arrayElemAt: ['$farmer.address.pin_code', 0] },
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "batches.seller_id",
                    foreignField: "_id",
                    as: "sellers",
                },
            },
            {
                $addFields: {
                    sellers: {
                        AssociateName: { $arrayElemAt: ['$sellers.basic_details.associate_details.organization_name', 0] },
                        AssociateId: { $arrayElemAt: ['$sellers.user_code', 0] },
                    }
                }
            },
            {
                $lookup: {
                    from: "procurementcenters",
                    localField: "batches.procurementCenter_id",
                    foreignField: "_id",
                    as: "ProcurementCenter",
                },
            },
            {
                $addFields: {
                    ProcurementCenter: {
                        CenterCode: { $arrayElemAt: ['$ProcurementCenter.center_code', 0] },
                        CenterName: { $arrayElemAt: ['$ProcurementCenter.center_name', 0] },
                        Address: {
                            line1: { $arrayElemAt: ['$ProcurementCenter.address.line1', 0] },
                            line2: { $arrayElemAt: ['$ProcurementCenter.address.line2', 0] },
                            country: { $arrayElemAt: ['$ProcurementCenter.address.country', 0] },
                            state: { $arrayElemAt: ['$ProcurementCenter.address.state', 0] },
                            district: { $arrayElemAt: ['$ProcurementCenter.address.district', 0] },
                            city: { $arrayElemAt: ['$ProcurementCenter.address.city', 0] },
                            postalCode: { $arrayElemAt: ['$ProcurementCenter.address.postalCode', 0] },
                            lat: { $arrayElemAt: ['$ProcurementCenter.address.lat', 0] },
                            long: { $arrayElemAt: ['$ProcurementCenter.address.long', 0] },
                        }
                    }
                }
            },
            {
                $addFields: {
                    qtyProcuredInInvoice: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toInt: '$$inv.qtyProcured' }
                                    in: '$$inv.qtyProcured' // Removed $toInt conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    paymentStatus: {
                        $cond: {
                            if: {
                                $gt: [
                                    { $size: { $filter: { input: { $map: { input: '$invoice', as: 'inv', in: '$$inv.payment_status' } }, cond: { $eq: ['$$this', 'Pending'] } } } },
                                    0
                                ]
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    qtyProcuredInInvoice: 1,
                    paymentStatus: 1,
                    batches: 1,
                    'farmer.name': 1,
                    'farmer.farmer_id': 1,
                    'farmer.parents.father_name': 1,
                    'farmer.basic_details.dob': 1,
                    'farmer.address.address_line_1': 1,
                    'farmer.address.country': 1,
                    'farmer.address.tahshil': 1,
                    'farmer.address.village': 1,
                    'farmer.address.pin_code': 1,
                    'ProcurementCenter.CenterCode': 1,
                    'ProcurementCenter.CenterName': 1,
                    'ProcurementCenter.Address.line1': 1,
                    'ProcurementCenter.Address.line2': 1,
                    'ProcurementCenter.Address.country': 1,
                    'ProcurementCenter.Address.state': 1,
                    'ProcurementCenter.Address.district': 1,
                    'ProcurementCenter.Address.city': 1,
                    'ProcurementCenter.Address.postalCode': 1,
                    'ProcurementCenter.Address.lat': 1,
                    'ProcurementCenter.Address.long': 1,
                    'sellers.basic_details.associate_details.organization_name': 1,
                    'sellers.user_code': 1,
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = { count: 0 }
        records.rows = await RequestModel.aggregate(aggregationPipeline);

        records.count = await RequestModel.countDocuments({ _id: { $in: paymentIds } })
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }
        if (isExport == 1) {
            const exportRecords = await RequestModel.aggregate([...aggregationPipeline.filter(stage => !stage.$skip && !stage.$limit)]);

            const record = exportRecords.map((item) => {
                const batchIds = item?.batches?.map(batch => batch.batchId).join(', ') || "NA";
                const dispatchedDates = item?.batches?.map(batch => batch.dispatched?.dispatched_at || "NA").join(", ") || "NA";
                const intransitDates = item?.batches?.map(batch => batch.intransit?.intransit_at || "NA").join(", ") || "NA";
                const receivingDates = item?.batches
                    ?.map(batch => batch?.dispatched?.qc_report?.received?.map(received => received?.on || "NA"))
                    ?.flat()
                    ?.join(", ") || "NA";
                return {
                    "Order ID": item?.reqNo || "NA",
                    "Product Name": item?.product?.name || "NA",
                    "Quntity": item?.product?.quantity || "NA",
                    "Payment Status": item?.paymentStatus || "NA",
                    "Batch Id": batchIds,
                    FarmerName: item.farmer?.[0]?.name || '',
                    FarmerID: item.farmer?.[0]?.farmer_id || '',
                    FarmerDOB: item.farmer?.[0]?.basic_details?.dob || '',
                    FarmerAddrees: item.farmer?.[0]?.address?.address_line_1 || '',
                    Country: item.farmer?.[0]?.address?.country || '',
                    FarmerVillage: item.farmer?.[0]?.address?.village || '',
                    FarmerTahsil: item.farmer?.[0]?.address?.tahshil || '',
                    FarmerpINCode: item.farmer?.[0]?.address?.pin_code || '',
                    AssociateName: item.sellers?.[0]?.basic_details.associate_details?.organization_name || '',
                    AssociateId: item.sellers?.[0]?.user_code || '',
                    "Procurement Center Code": item.ProcurementCenter?.[0]?.CenterCode || "NA",
                    "Procurement Center Name": item.ProcurementCenter?.[0]?.CenterName || "NA",
                    "Procurement Address Line1": item.ProcurementCenter?.[0]?.Address?.line1 || "NA",
                    "Procurement Address Line2": item.ProcurementCenter?.[0]?.Address?.line2 || "NA",
                    "Procurement Country": item.ProcurementCenter?.[0]?.Address?.country || "NA",
                    "Procurement State": item.ProcurementCenter?.[0]?.Address?.state || "NA",
                    "Procurement District": item.ProcurementCenter?.[0]?.Address?.district || "NA",
                    "Procurement City": item.ProcurementCenter?.[0]?.Address?.city || "NA",
                    "Procurement Postal Code": item.ProcurementCenter?.[0]?.Address?.postalCode || "NA",
                    "Delivery location": "HAUZ KHAS",
                    "Dispatched Date": dispatchedDates,
                    "In-Transit Date": intransitDates,
                    "Receivinng Date": receivingDates,
                };
            });
            if (record.length > 0) {
                return dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Agent-associate-Payment-record.xlsx`,
                    worksheetName: `Agent-associate-Payment-record`,
                });
            } else {
                return res
                    .status(400)
                    .send(
                        new serviceResponse({
                            status: 400,
                            data: records,
                            message: _response_message.notFound("Payment"),
                        })
                    );
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.proceedToPayPaymentRequests = async (req, res) => {
    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        // let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};
        const paymentIds = (await AssociateInvoice.find({})).map(i => i.req_id);

        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds } } },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'invoice',
                }
            },
            // start of Sangita code      
            {
                $lookup: {
                    from: 'branches',
                    localField: 'branch_id',
                    foreignField: '_id',
                    as: 'branchDetails'
                }
            },
            // end of Sangita code
            {
                $addFields: {
                    qtyProcuredInInvoice: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toInt: '$$inv.qtyProcured' }
                                    in: '$$inv.qtyProcured' // Removed $toInt conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    paymentStatus: {
                        $cond: {
                            if: {
                                $gt: [
                                    { $size: { $filter: { input: { $map: { input: '$invoice', as: 'inv', in: '$$inv.payment_status' } }, cond: { $eq: ['$$this', 'Pending'] } } } },
                                    0
                                ]
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    qtyProcuredInInvoice: 1,
                    paymentStatus: 1,
                    'branchDetails.branchName': 1,
                    'branchDetails.branchId': 1
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = { count: 0 }
        records.rows = await RequestModel.aggregate(aggregationPipeline);

        records.count = await RequestModel.countDocuments({ _id: { $in: paymentIds } })
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.AssociateTabassociateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const paymentIds = (await AssociateInvoice.find({ req_id })).map(i => i.associateOffer_id);

        let query = {
            _id: { $in: paymentIds },
            req_id: new mongoose.Types.ObjectId(req_id),
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        ////////// start of Sangita code

        records.allBatchApprovalStatus = _paymentApproval.pending;

        const pendingBatch = await Batch.find({ req_id, agent_approve_status: _paymentApproval.pending });

        if (pendingBatch.length > 0) {
            records.allBatchApprovalStatus = _paymentApproval.pending;
        } else {
            records.allBatchApprovalStatus = _paymentApproval.approved;
        }

        ////////// end of Sangita code

        const pipeline = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'associateOffer_id',
                    as: 'invoice',

                },

            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'seller_id',
                    foreignField: '_id',
                    as: 'users',
                }
            },
            {
                $unwind: "$users"
            },
            {
                $addFields: {
                    amountProposed: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    paymentStatus: {
                        $cond: {
                            if: {
                                $gt: [
                                    { $size: { $filter: { input: { $map: { input: '$invoice', as: 'inv', in: '$$inv.payment_status' } }, cond: { $eq: ['$$this', 'Pending'] } } } },
                                    0
                                ]
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    "users.user_code": 1,
                    "users.basic_details.associate_details.associate_name": 1,
                    "amountProposed": 1,
                    "amountPayable": 1,
                    "paymentStatus": 1,
                    "offeredQty": 1
                }
            },
            // Start of Sangita code
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
            {
                $limit: limit ? parseInt(limit) : 10
            }
            // End of Sangita code
        ]


        records.rows = await AssociateOffers.aggregate(pipeline);

        records.count = await AssociateOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Associate Id": item?.seller_id.user_code || "NA",
                    "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
                    "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
                    "Quantity Purchased": item?.offeredQty || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
                    worksheetName: `Associate Orders-record-${'Associate Orders'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.proceedToPayAssociateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const paymentIds = (await AssociateInvoice.find({ req_id })).map(i => i.associateOffer_id);

        let query = {
            _id: { $in: paymentIds },
            req_id: new mongoose.Types.ObjectId(req_id),
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });


        const pipeline = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'associateOffer_id',
                    as: 'invoice',

                },

            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'seller_id',
                    foreignField: '_id',
                    as: 'users',
                }
            },
            {
                $unwind: "$users"
            },
            {
                $addFields: {
                    amountProposed: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove $toDouble Conversion

                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove $toDouble Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    paymentStatus: {
                        $cond: {
                            if: {
                                $gt: [
                                    { $size: { $filter: { input: { $map: { input: '$invoice', as: 'inv', in: '$$inv.payment_status' } }, cond: { $eq: ['$$this', 'Pending'] } } } },
                                    0
                                ]
                            },
                            then: 'Pending',
                            else: 'Completed'
                        }
                    }
                }
            },
            {
                $project: {
                    "users.user_code": 1,
                    "users.basic_details.associate_details.associate_name": 1,
                    "users.basic_details.associate_details.organization_name": 1,
                    "amountProposed": 1,
                    "amountPayable": 1,
                    "paymentStatus": 1,
                    "procuredQty": 1
                }
            },
            // Start of Sangita code
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
            {
                $limit: limit ? parseInt(limit) : 10
            }
            // End of Sangita code

        ]


        records.rows = await AssociateOffers.aggregate(pipeline);

        records.count = await AssociateOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Associate Id": item?.seller_id.user_code || "NA",
                    "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
                    "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
                    "Quantity Purchased": item?.offeredQty || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
                    worksheetName: `Associate Orders-record-${'Associate Orders'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.AssociateTabBatchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, req_id, isExport = 0 } = req.query

        const paymentIds = (await AssociateInvoice.find({ associateOffer_id })).map(i => i.batch_id);

        let query = {
            _id: { $in: paymentIds },
            associateOffer_id: new mongoose.Types.ObjectId(associateOffer_id),
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        console.log('query', query);

        const records = { count: 0 };

        const pipeline = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementcenters',
                }
            },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'batch_id',
                    as: 'invoice',
                }
            },
            {
                $addFields: {
                    qtyPurchased: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toInt: '$$inv.qtyProcured' }
                                    in: '$$inv.qtyProcured' // Removed $toInt conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    amountProposed: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove $toDouble Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove $toDouble Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                }
            },
            {
                $unwind: "$procurementcenters"
            },
            {
                $unwind: "$invoice"
            },
            {
                $project: {
                    "batchId": 1,
                    "procurementcenters._id": 1,
                    "procurementcenters.center_name": 1,
                    "procurementcenters.center_code": 1,
                    "invoice.initiated_at": 1,
                    "invoice.bills.total": 1,
                    amountPayable: 1,
                    qtyPurchased: 1,
                    amountProposed: 1
                }
            },
            // Start of Sangita code
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
            {
                $limit: limit ? parseInt(limit) : 10
            }
            // End of Sangita code

        ]

        records.rows = await Batch.aggregate(pipeline);

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Associate Id": item?.seller_id.user_code || "NA",
                    "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
                    "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
                    "Quantity Purchased": item?.offeredQty || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
                    worksheetName: `Associate Orders-record-${'Associate Orders'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.proceedToPayAssociateTabBatchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id, req_id, isExport = 0 } = req.query

        const paymentIds = (await AssociateInvoice.find({ associateOffer_id })).map(i => i.batch_id);

        let query = {
            _id: { $in: paymentIds },
            associateOffer_id: new mongoose.Types.ObjectId(associateOffer_id),
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        console.log('query', query);

        const records = { count: 0 };

        const pipeline = [
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'procurementcenters',
                    localField: 'procurementCenter_id',
                    foreignField: '_id',
                    as: 'procurementcenters',
                }
            },
            {
                $lookup: {
                    from: 'associateinvoices',
                    localField: '_id',
                    foreignField: 'batch_id',
                    as: 'invoice',
                }
            },
            {
                $addFields: {
                    qtyPurchased: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toInt: '$$inv.qtyProcured' }
                                    in: '$$inv.qtyProcured' // Removed $toInt conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    amountProposed: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove $toDouble Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: {
                                $map: {
                                    input: '$invoice',
                                    as: 'inv',
                                    // in: { $toDouble: '$$inv.bills.total' } // Convert to double if needed
                                    in: '$$inv.bills.total' // remove $toDouble Conversion
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this'] }
                        }
                    },
                }
            },
            {
                $unwind: "$procurementcenters"
            },
            {
                $unwind: "$invoice"
            },
            {
                $project: {
                    "batchId": 1,
                    "procurementcenters._id": 1,
                    "procurementcenters.center_name": 1,
                    "procurementcenters.center_code": 1,
                    "invoice.initiated_at": 1,
                    "invoice.bills.total": 1,
                    "invoice.payment_status": 1,
                    amountPayable: 1,
                    qtyPurchased: 1,
                    amountProposed: 1
                }
            },
            // Start of sangita code
            ...(sortBy ? [{ $sort: { [sortBy]: 1 } }] : []),
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []),
            {
                $limit: limit ? parseInt(limit) : 10
            }
            // End of Sangita code
        ]


        records.rows = await Batch.aggregate(pipeline);

        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                return {
                    "Associate Id": item?.seller_id.user_code || "NA",
                    "Associate Type": item?.seller_id.basic_details.associate_details.associate_type || "NA",
                    "Associate Name": item?.seller_id.basic_details.associate_details.associate_name || "NA",
                    "Quantity Purchased": item?.offeredQty || "NA",
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate Orders-${'Associate Orders'}.xlsx`,
                    worksheetName: `Associate Orders-record-${'Associate Orders'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate Orders") }))
            }
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getBill = async (req, res) => {

    try {
        const { batchId } = req.query

        const { user_id, user_type } = req;

        const associateInvoiceRecord = await AssociateInvoice.findOne({ batch_id: batchId })
        const batchRecord = await Batch.findOne({ _id: batchId }).select({ _id: 1, batchId: 1, req_id: 1, dispatchedqty: 1, goodsPrice: 1, totalPrice: 1, dispatched: 1 });
        const response = { ...JSON.parse(JSON.stringify(batchRecord)), logs: associateInvoiceRecord.logs }

        return res.status(200).send(new serviceResponse({ status: 200, data: response, message: _query.get('Payment') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.AssociateTabBatchApprove = async (req, res) => {

    try {

        const { batchIds } = req.body;
        const { portalId } = req
        const result = await Batch.updateMany(
            { _id: { $in: batchIds } },  // Match any batchIds in the provided array
            { $set: { agent_approval_at: new Date(), agent_approve_by: portalId, agent_approve_status: _paymentApproval.approved } } // Set the new status for matching documents
        );

        if (result.matchedCount === 0) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "No matching Batch found" }] }));
        }
        await AssociateInvoice.updateMany(
            { batch_id: { $in: batchIds } },
            { $set: { agent_approve_status: _paymentApproval.approved, agent_approve_at: new Date(), agent_approve_by: portalId } }
        )

        return res.status(200).send(new serviceResponse({ status: 200, message: `${result.modifiedCount} Batch Approved successfully` }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.AssociateTabGenrateBill = async (req, res) => {

    try {
        const { req_id } = req.query;

        const existingRecord = await AgentInvoice.findOne({ req_id });

        if (existingRecord) {
            return res.status(200).send(new serviceResponse({ status: 200, data: existingRecord, message: _response_message.found("bill") }))
        }

        const associateInvoice = await AssociateInvoice.find({ req_id, agent_approve_status: _paymentApproval.approved })

        const agentInvoice = associateInvoice.reduce((acc, curr) => {

            if (!acc.req_id)
                acc.req_id = curr.req_id;

            if (!acc.ho_id)
                acc.ho_id = curr.ho_id;

            if (!acc.bo_id)
                acc.bo_id = curr.bo_id;

            if (!acc.batch_id) {
                acc.batch_id = [curr.batch_id];
            } else {
                acc.batch_id.push(curr.batch_id);
            }

            // acc.qtyProcured += parseInt(curr.qtyProcured);
            // acc.goodsPrice += parseInt(curr.goodsPrice);
            // acc.bill.precurement_expenses += parseInt(curr.bills.procurementExp);
            // acc.bill.driage += parseInt(curr.bills.driage);
            // acc.bill.storage_expenses += parseInt(curr.bills.storageExp);
            // acc.bill.commission += parseInt(curr.bills.commission);
            // acc.bill.total += parseInt(curr.bills.total);

            acc.qtyProcured += handleDecimal(curr.qtyProcured);
            acc.goodsPrice += handleDecimal(curr.goodsPrice);
            acc.bill.precurement_expenses += handleDecimal(curr.bills.procurementExp);
            acc.bill.driage += handleDecimal(curr.bills.driage);
            acc.bill.storage_expenses += handleDecimal(curr.bills.storageExp);
            acc.bill.commission += handleDecimal(curr.bills.commission);
            acc.bill.total += handleDecimal(curr.bills.total);

            acc.agent_id = req.user.portalId._id

            return acc;
        }, { qtyProcured: 0, goodsPrice: 0, initiated_at: new Date(), bill: { precurement_expenses: 0, driage: 0, storage_expenses: 0, commission: 0, total: 0 } });


        const record = await AgentInvoice.create(agentInvoice);

        record.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });



        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: `Bill Genrated successfully` }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateBillApprove = async (req, res) => {

    try {

        const { batchIds = [] } = req.body;
        const { portalId } = req;

        // Start of Sangita code

        const batchQuery = {
            _id: { $in: batchIds },
            $or: [
                { "bo_approve_status": _paymentApproval.pending },
                { "ho_approve_status": _paymentApproval.pending },
            ]
        };

        const batchApprovalStatus = await Batch.find(batchQuery);

        if (batchApprovalStatus.length > 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notApproved("Payment") }] }));
        }

        //End of sangita code

        const query = { batch_id: { $in: batchIds } };

        const invoiceRecord = await AssociateInvoice.find(query);

        if (invoiceRecord.length != batchIds.length) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("invoice") }] }));
        }

        const record = await AssociateInvoice.updateMany(query, { $set: { agent_approve_status: _paymentApproval.approved, agent_approve_by: portalId, agent_approve_at: new Date() } });

        await Batch.updateMany({ _id: { $in: batchIds } }, { $set: { agent_approve_status: _paymentApproval.approved } });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("invoice") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

const updateAssociateLogs = async (batchIds) => {

    const invoiceRecord = await AssociateInvoice.find({ batch_id: { $in: batchIds } });
    const updatedLogs = await Promise.all(invoiceRecord.map(async (invoice) => {

        let log = {
            bills: {
                procurementExp: invoice.bills.procurementExp,
                qc_survey: invoice.bills.qc_survey,
                gunny_bags: invoice.bills.gunny_bags,
                weighing_stiching: invoice.bills.weighing_stiching,
                loading_unloading: invoice.bills.loading_unloading,
                transportation: invoice.bills.transportation,
                driage: invoice.bills.driage,
                storageExp: invoice.bills.storageExp,
                commission: invoice.bills.commission,
                total: invoice.bills.total,

                // Rejection case
                agent_reject_by: invoice.bills.agent_reject_by || null,
                agent_reject_at: invoice.bills.agent_reject_at || null,
                reason_to_reject: invoice.bills.reason_to_reject || null
            },
            payment_change_remarks: invoice.payment_change_remarks || null,
            initiated_at: invoice.initiated_at,
            agent_approve_status: invoice.agent_approve_status,
            agent_approve_by: invoice.agent_approve_by,
            agent_approve_at: invoice.agent_approve_at,
            payment_status: invoice.payment_status,
            payment_id: invoice.payment_id,
            transaction_id: invoice.transaction_id,
            payment_method: invoice.payment_method
        };

        invoice.logs.push(log)
        await invoice.save()

    }))

    return true

}

module.exports.associateBillReject = async (req, res) => {

    try {

        const { batchIds = [], comment = "No reject reason given" } = req.body;
        const { portalId, user } = req;

        const batchQuery = { _id: { $in: batchIds } }

        const batchList = await Batch.find(batchQuery);

        if (batchList.length < 1) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Batch') }] }));
        }

        const fetchedBatchIds = batchList.map(item => item._id)

        const query = { batch_id: { $in: fetchedBatchIds } };

        const invoiceRecord = await AssociateInvoice.find(query);

        if (invoiceRecord.length != batchIds.length) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("invoice") }] }));
        }

        // update logs with current bill and approval statuses 
        await updateAssociateLogs(batchIds)

        const record = await AssociateInvoice.updateMany(query, {
            $set: {
                agent_approve_status: _paymentApproval.rejected,
                agent_approve_by: null,
                agent_approve_at: null,

                "bills.agent_reject_by": user._id,
                "bills.agent_reject_at": new Date(),
                "bills.reason_to_reject": comment

            }
        });

        const batchRejected = await Batch.updateMany(
            { _id: { $in: fetchedBatchIds } },
            {
                $set: {
                    agent_approve_status: _paymentApproval.rejected,
                    agent_approve_by: null,
                    agent_approve_at: null,

                }
            });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.rejectedSuccessfully("Batches") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.agentPayments = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query

        let query = search ? {
            $or: [
                { "req_id.reqNo": { $regex: search, $options: 'i' } },
                { "bo_id.branchId": { $regex: search, $options: 'i' } },
                { "req_id.product.name": { $regex: search, $options: 'i' } }
            ]
        } : {};

        const records = { count: 0 };

        records.rows = paginate == 1 ? await AgentInvoice.find(query).select({ "qtyProcured": 1, "payment_status": 1, "bill": 1 })
            .populate([{ path: "bo_id", select: "branchId" }, { path: "req_id", select: "product deliveryDate quotedPrice reqNo" }])
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Batch.find(query).select({ "qtyProcured": 1, "payment_status": 1, "bill": 1 })
                .populate([{ path: "bo_id", select: "branchId" }, { path: "req_id", select: "reqNo product.name" }])
                .sort(sortBy)
        records.count = await AgentInvoice.countDocuments(query);
        if (isExport == 1) {
            const recordsdata = await AgentInvoice.find(query)
                .select({ qtyProcured: 1, payment_status: 1, bill: 1 })
                .populate([
                    { path: "bo_id", select: "branchId" },
                    { path: "req_id", select: "product deliveryDate quotedPrice reqNo" },
                ]);

            const exportData = recordsdata.map(record => ({
                ReqNo: record.req_id?.reqNo || "N/A",
                BranchId: record.bo_id?.branchId || "N/A",
                ProductName: record.req_id?.product?.name || "N/A",
                ProductGrade: record.req_id?.product?.grade || "N/A",
                ProductQuantity: record.req_id?.product?.quantity || 0,
                QuotedPrice: record.req_id?.quotedPrice || 0,
                DeliveryDate: record.req_id?.deliveryDate || "N/A",
                QtyProcured: record.qtyProcured || 0,
                PaymentStatus: record.payment_status || "N/A",
                ProcurementExpenses: record.bill?.precurement_expenses || 0,
                Driage: record.bill?.driage || 0,
                StorageExpenses: record.bill?.storage_expenses || 0,
                Commission: record.bill?.commission || 0,
                Total: record.bill?.total || 0,
            }));

            if (exportData.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: exportData,
                    fileName: `agent-Payment-records.xlsx`,
                    worksheetName: `agent-Payment-records`,
                });
                return;
            } else {
                return res
                    .status(404)
                    .send(new serviceResponse({ status: 404, data: {}, message: _response_message.notFound("Payment") }));
            }
        }

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.editBill = async (req, res) => {

    const { id, procurement_expenses, driage, storage, bill_attachement, remarks } = req.body;

    const record = await AgentInvoice.findOne({ _id: id });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("payment") }] }));
    }

    const cal_procurement_expenses = handleDecimal(procurement_expenses);
    const cal_driage = handleDecimal(driage);
    const cal_storage = handleDecimal(storage);
    const commission = (cal_procurement_expenses + cal_driage + cal_storage * 1) / 100;
    const cal_commission = handleDecimal(commission);

    record.bill.precurement_expenses = cal_procurement_expenses;
    record.bill.driage = cal_driage;
    record.bill.storage_expenses = cal_storage;
    record.bill.commission = cal_commission;
    record.bill.bill_attachement = bill_attachement;
    record.bill.total = handleDecimal(cal_procurement_expenses + cal_driage + cal_storage + cal_commission);

    record.payment_change_remarks = remarks;

    record.bo_approve_status = _paymentApproval.pending;
    record.ho_approve_status = _paymentApproval.pending;

    await updateAgentInvoiceLogs(id);

    await record.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("bill") }));
}


const updateAgentInvoiceLogs = async (agencyInvoiceId) => {

    try {
        const agentBill = await AgentInvoice.findOne({ _id: agencyInvoiceId });

        const log = {
            bo_approve_status: agentBill.bo_approve_status,
            bo_approve_by: agentBill.bo_approve_by,
            bo_approve_at: agentBill.bo_approve_at,
            ho_approve_status: agentBill.ho_approve_status,
            ho_approve_by: agentBill.ho_approve_by,
            ho_approve_at: agentBill.ho_approve_at,
            payment_status: agentBill.payment_status,
            payment_id: agentBill.payment_id,
            transaction_id: agentBill.transaction_id,
            payment_method: agentBill.payment_method,

            bill: {
                precurement_expenses: agentBill.bill.precurement_expenses,
                driage: agentBill.bill.driage,
                storage_expenses: agentBill.bill.storage_expenses,
                commission: agentBill.bill.commission,
                bill_attachement: agentBill.bill.bill_attachement,
                total: agentBill.bill.total,

                // bo rejection case
                bo_reject_by: agentBill.bill.bo_reject_by,
                bo_reject_at: agentBill.bill.bo_reject_at,
                bo_reason_to_reject: agentBill.bill.bo_reason_to_reject,

                // ho rejection case
                ho_reject_by: agentBill.bill.ho_reject_by,
                ho_reject_at: agentBill.bill.ho_reject_at,
                ho_reason_to_reject: agentBill.bill.ho_reason_to_reject
            },
            payment_change_remarks: agentBill.payment_change_remarks
        };


        agentBill.logs.push(log)
        await agentBill.save()


        return true
    } catch (error) {
        throw error
    }

}


module.exports.getBillProceedToPay = async (req, res) => {

    try {
        const { id } = req.query

        const billPayment = await AssociateInvoice.findOne({ batch_id: id })
            .populate({ path: "batch_id", select: "dispatched.bills" })

        if (!billPayment) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("bill") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: billPayment, message: _response_message.found("bill") }))


    } catch (error) {
        _handleCatchErrors(error, res);
    }

}


module.exports.agencyBill = async (req, res) => {

    try {
        const { id, isPdf = 0 } = req.query;

        const billPayment = await AgentInvoice.findOne({ _id: id }).select({ bill: 1 })
            .populate({ path: "req_id", select: "reqNo product quotedPrice deliveryDate status" })

        if (isPdf == 1) {

            const record = {
                "reqNo": billPayment?.req_id.reqNo || "NA",
                "name": billPayment?.req_id.product.name || "NA",
                "commodityImage": billPayment?.req_id.product.commodityImage || "NA",
                "grade": billPayment?.req_id.product.grade || "NA",
                "qantity": billPayment?.req_id.product.qantity || "NA",
                "quotedPrice": billPayment?.req_id.product.quotedPrice || "NA",
                "deliveryDate": billPayment?.req_id.product.deliveryDate || "NA",
                "status": billPayment?.req_id.product.status || "NA",
                "precurement_expenses": billPayment?.bill.precurement_expenses || "NA",
                "storage_expenses": billPayment?.bill.storage_expenses || "NA",
                "driage": billPayment?.bill.driage || "NA",
                "commission": billPayment?.bill.commission || "NA",
                "total": billPayment?.bill.total || "NA",
            }

            if (record) {

                dumpJSONToPdf(req, res, {
                    data: [record],
                    fileName: `Agency-bill.xlsx`,
                    worksheetName: `Agency-bill`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("bill") }] }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: billPayment, message: _response_message.found("bill") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.editAssociateBill = async (req, res) => {

    const { invoiceId, procurement_expenses, driage, storage, bill_attachement, remarks } = req.body;

    const record = await AssociateInvoice.findOne({ _id: invoiceId });

    if (!record) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Bill") }] }));
    }

    const cal_procurement_expenses = handleDecimal(procurement_expenses)
    const cal_driage = handleDecimal(driage)
    const cal_storage = handleDecimal(storage)
    const commission = (cal_procurement_expenses + cal_driage + cal_storage * 0.5) / 100;
    const cal_commission = handleDecimal(commission);
    const total = handleDecimal(cal_procurement_expenses + cal_driage + cal_storage + cal_commission)

    record.bills.procurementExp = cal_procurement_expenses;
    record.bills.driage = cal_driage;
    record.bills.storageExp = cal_storage;
    record.bills.commission = cal_commission;
    record.bills.total = total;
    record.payment_change_remarks = remarks;
    record.agent_approve_status = _paymentApproval.pending

    const batch = await Batch.findOne({ _id: record.batch_id });

    if (!batch) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Batch') }] }));
    }

    await updateAssociateBillLogs(invoiceId)

    batch.agent_approve_status = _paymentApproval.pending
    batch.ho_approve_status = _paymentApproval.pending
    batch.bo_approve_status = _paymentApproval.pending

    await batch.save()

    await record.save()

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("bill") }))

}

const updateAssociateBillLogs = async (invoiceId) => {

    try {
        const invoice = await AssociateInvoice.findOne({ _id: invoiceId });

        const log = {
            bills: {
                procurementExp: handleDecimal(invoice.bills.procurementExp),
                qc_survey: invoice.bills.qc_survey,
                gunny_bags: invoice.bills.gunny_bags,
                weighing_stiching: invoice.bills.weighing_stiching,
                loading_unloading: invoice.bills.loading_unloading,
                transportation: invoice.bills.transportation,
                driage: handleDecimal(invoice.bills.driage),
                storageExp: handleDecimal(invoice.bills.storageExp),
                commission: handleDecimal(invoice.bills.commission),
                total: handleDecimal(invoice.bills.total),

                // Rejection case
                agent_reject_by: invoice.bills.agent_reject_by,
                agent_reject_at: invoice.bills.agent_reject_at,
                reason_to_reject: invoice.bills.reason_to_reject
            },
            initiated_at: invoice.initiated_at,
            agent_approve_status: invoice.agent_approve_status,
            agent_approve_by: invoice.agent_approve_by,
            agent_approve_at: invoice.agent_approve_at,
            payment_status: invoice.payment_status,
            payment_id: invoice.payment_id,
            transaction_id: invoice.transaction_id,
            payment_method: invoice.payment_method,
            payment_change_remarks: invoice.payment_change_remarks || null
        };

        invoice.logs.push(log)
        await invoice.save()

        return true

    } catch (error) {
        throw error
    }

}

