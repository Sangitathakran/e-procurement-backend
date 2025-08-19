const { _generateOrderNumber, _addDays, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents, _associateOfferStatus, _status, _requestStatus } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { default: mongoose } = require("mongoose");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { User } = require("@src/v1/models/app/auth/User");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { Commodity } = require("@src/v1/models/master/Commodity");
const { Scheme } = require("@src/v1/models/master/Scheme");


module.exports.createProcurement = asyncErrorHandler(async (req, res) => {
    const { user_id, user_type } = req;
    const { quotedPrice, deliveryDate, name, warehouse_id, commodityImage, grade, quantity, deliveryLocation, lat, long, quoteExpiry, head_office_id, branch_id, expectedProcurementDate, commodity_id, schemeId, standard, substandard, sla_id } = req.body;

    if (user_type && user_type != _userType.agent) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }));
    }

    let randomVal;
    let isUnique = false;

    while (!isUnique) {
        randomVal = _generateOrderNumber();
        const existingReq = await RequestModel.findOne({ reqNo: randomVal });
        if (!existingReq) {
            isUnique = true;
        }
    }

    const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

    if (moment(delivery_date).isBefore(quoteExpiry)) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] }));
    }

    const record = await RequestModel.create({
        head_office_id,
        branch_id,
        reqNo: randomVal,
        expectedProcurementDate,
        quotedPrice: handleDecimal(quotedPrice),
        deliveryDate: delivery_date,
        product: {
            name,
            commodityImage,
            grade,
            quantity: handleDecimal(quantity),
            schemeId,
            commodity_id,
            standard,
            substandard
        },
        address: {
            deliveryLocation,
            lat: handleDecimal(lat),
            long: handleDecimal(long)
        },
        warehouse_id: warehouse_id,
        sla_id,
        quoteExpiry: moment(quoteExpiry).toDate(),
        createdBy: user_id
    });

    eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" });
    const requestData = {
        order_no: record.reqNo,
        commodity_name: record.product.name,
        quantity_request: handleDecimal(record.product.quantity),
        quoteExpiry: record.quoteExpiry,
        expectedProcurementDate: record.expectedProcurementDate
    };

    const users = await User.find({
        'basic_details.associate_details.email': { $exists: true }
    }).select('basic_details.associate_details.email basic_details.associate_details.associate_name');

    const branchData = await Branches.findOne({ _id: branch_id });

    const subject = `Procurement Requirement ${record?.reqNo} Successfully Added`;
    const body = `<p> Dear < Name>, </p> <br/>
                <p> We are delighted to inform you that a procurement requirement has been successfully added under following details: </p> 
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>Order ID</th>
                    <td> ${record?.reqNo} </td>
                </tr>
                <tr>
                    <th>Branch Office Name</th>
                    <td> ${branchData?.branchName}</td>
                </tr>
                <tr>
                    <th>Commodity</th>
                    <td>${record?.product.name} </td>
                </tr>
                <tr>
                    <th>Quantity</th>
                    <td> ${handleDecimal(record?.product.quantity)}</td>
                </tr>
                <tr>
                    <th>MSP/Quintal</th>
                    <td> ${handleDecimal(record?.quotedPrice)}</td>
                </tr>
                </table>
                <br/>
                <p>  Please follow the link below for additional Information:<a href="https://ep-testing.navbazar.com/agent/requirements"> Click here </a>  </p> <br/> 
                <p> Need Help? </p> <br/> 
                <p> For queries or any assistance, contact us at <9567------> </p> <br/> 
                <p> Warm regards,  </p> <br/> 
                <p> Navankur. </p> `;

    await sendMail("ashita@navankur.org", null, subject, body);
    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("procurement") }));
});

module.exports.getProcurement = asyncErrorHandler(async (req, res) => {

    const { page, limit, skip, paginate = 1, sortBy, search = '', ho_id, bo_id, schemeId, commodity, isExport = 0 } = req.query
    const { portalId, user_id } = req;

    let query = search ? {
        $or: [
            { "reqNo": { $regex: search, $options: 'i' } },
            { "product.name": { $regex: search, $options: 'i' } },
            { "product.grade": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query["sla_id"] = { $in: [portalId, user_id] };

    if (commodity) {
        query["product.name"] = { $regex: commodity, $options: 'i' };
    }

    if (schemeId) {
        const schemeIds = Array.isArray(schemeId) ? schemeId : schemeId.split(",");
        query["product.schemeId"] = { $in: schemeIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    if (ho_id) {
        const hoIds = Array.isArray(ho_id) ? ho_id : ho_id.split(",");
        query["head_office_id"] = { $in: hoIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    if (bo_id) {
        const boIds = Array.isArray(bo_id) ? bo_id : bo_id.split(",");
        query["branch_id"] = { $in: boIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const records = { count: 0 };

    if (isExport != 1 && paginate == 1) {
        records.rows = await RequestModel.find(query)
            .sort(sortBy)
            .skip(skip)
            .populate({ path: "branch_id", select: "_id branchName branchId" })
            .populate({ path: "head_office_id", select: "_id company_details.name" })
            .populate({ path: "sla_id", select: "_id basic_details.name" })
            .populate({ path: "warehouse_id", select: "addressDetails" })
            .populate({ path: "product.schemeId", select: "schemeName season period" })
            .limit(parseInt(limit))
    } else {
        records.rows = await RequestModel.find(query)
            .sort(sortBy)
            .populate({ path: "branch_id", select: "_id branchName branchId" })
            .populate({ path: "head_office_id", select: "_id company_details.name" })
            .populate({ path: "sla_id", select: "_id basic_details.name" })
            .populate({ path: "warehouse_id", select: "addressDetails" })
            .populate({ path: "product.schemeId", select: "schemeName season period" })
    }

    records.rows = records.rows.map(item => {
        const scheme = item?.product?.schemeId;
        const commodity = item?.product?.name;

        const schemeName = scheme
            ? `${scheme.schemeName || ''} ${commodity || ''} ${scheme.season || ''} ${scheme.period || ''}`
            : `${commodity || 'NA'}`;

        return {
            ...item.toObject(),
            SchemeName: schemeName
        };
    });




    records.count = await RequestModel.countDocuments(query);
    if (paginate == 1) {
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    }

    // return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }))

    if (isExport == 1) {

        const record = records.rows.map((item) => {

            return {
                "Order Id": item?.reqNo || "NA",
                "Commodity": item?.product?.name || "NA",
                "Scheme": item?.SchemeName || "NA",
                "CNA Name": item?.head_office_id?.company_details?.name || "NA",
                "BO Name": item?.branch_id?.branchName || "NA",
                "SLA Name": item?.sla_id?.basic_details?.name || "NA",
                "Sub Standard": item?.product?.substandard || "NA",
                "Quantity": item?.product?.quantity || "NA",
                "MSP": item?.quotedPrice || "NA",

            }
        })

        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Requirement-record.xlsx`,
                worksheetName: `Requirement-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("procurement") }))
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }))
    }

})

// module.exports.getProcurement = asyncErrorHandler(async (req, res) => {
//     try {
//         const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = {}, search = '', cna, scheme, commodity, branch, sla, isExport = 0 } = req.query;

//         let query = {};

//         // Search filter
//         if (search) {
//             query["$or"] = [
//                 { "reqNo": { $regex: search, $options: 'i' } },
//                 { "product.name": { $regex: search, $options: 'i' } },
//                 { "product.grade": { $regex: search, $options: 'i' } },
//             ];
//         }

//         // Filter by Scheme Name
//         if (scheme) {
//             query["product.schemeId"] = await Scheme.findOne({ schemeName: { $regex: scheme, $options: "i" } }).select("_id");
//         }

//         // Filter by Commodity Name
//         if (commodity) {
//             query["product.name"] = { $regex: commodity, $options: "i" };
//         }

//         // Filter by CNA (Head Office ID)
//         if (cna) {
//             query["head_office_id"] = cna;
//         }

//         // Filter by Branch Name
//         if (branch) {
//             query["branch_id.branchName"] = { $regex: branch, $options: "i" };
//         }

//         // Filter by SLA (Status)
//         if (sla) {
//             query["status"] = sla;
//         }

//         console.log("Generated Query:", JSON.stringify(query, null, 2)); // Debugging

//         const records = { count: 0 };

//         if (paginate == 1) {
//             records.rows = await RequestModel.find(query)
//                 .sort(sortBy)
//                 .skip(parseInt(skip))
//                 .limit(parseInt(limit))
//                 .populate({ path: "branch_id", select: "_id branchName branchId" })
//                 .populate({ path: "warehouse_id", select: "addressDetails" })
//                 .populate({ path: "product.schemeId", select: "schemeName" });

//             records.count = await RequestModel.countDocuments(query);
//             records.page = parseInt(page);
//             records.limit = parseInt(limit);
//             records.pages = records.limit !== 0 ? Math.ceil(records.count / records.limit) : 0;
//         } else {
//             records.rows = await RequestModel.find(query)
//                 .sort(sortBy)
//                 .populate({ path: "branch_id", select: "_id branchName branchId" })
//                 .populate({ path: "warehouse_id", select: "addressDetails" })
//                 .populate({ path: "product.schemeId", select: "schemeName" });
//             records.count = records.rows.length;
//         }

//         // If export is requested, prepare data for Excel
//         if (isExport == 1) {
//             const allRecords = await RequestModel.find(query)
//                 .sort(sortBy)
//                 .populate({ path: "branch_id", select: "_id branchName branchId" });

//             const record = allRecords.map((item) => ({
//                 "Order Id": item?.reqNo || "NA",
//                 "BO Name": item?.branch_id?.branchName || "NA",
//                 "Commodity": item?.product?.name || "NA",
//                 "Grade": item?.product?.grade || "NA",
//                 "Quantity": item?.product?.quantity || "NA",
//                 "MSP": item?.quotedPrice || "NA",
//                 "Delivery Location": item?.address?.deliveryLocation || "NA"
//             }));

//             if (record.length > 0) {
//                 return dumpJSONToExcel(req, res, {
//                     data: record,
//                     fileName: `Requirement-record.xlsx`,
//                     worksheetName: `Requirement-record`
//                 });
//             } else {
//                 return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("procurement") }));
//             }
//         }

//         return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));

//     } catch (error) {
//         console.error("Error in getProcurement:", error);
//         return res.status(500).send(new serviceResponse({ status: 500, message: "Internal Server Error", error }));
//     }
// });

module.exports.getAssociateOffer = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query;

    // Building the query
    let query = search ? {
        $or: [
            { "associate.user_code": { $regex: search, $options: 'i' } },
            { "associate.basic_details.associate_details.associate_name": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query.req_id = new mongoose.Types.ObjectId(req_id); // Add req_id filter if present

    const records = { count: 0 };

    // Aggregate the data
    records.rows = await AssociateOffers.aggregate([
        // Lookup FarmerOrders
        {
            $lookup: {
                from: 'farmerorders',
                localField: '_id',
                foreignField: 'associateOffers_id',
                as: 'farmerorders'
            }
        },
        // Lookup FarmerOffers (before moving to FarmerOrders)
        {
            $lookup: {
                from: 'farmeroffers',
                localField: '_id',
                foreignField: 'associateOffers_id',
                as: 'farmeroffers'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'seller_id',
                foreignField: '_id',
                as: 'associate'
            }
        },
        {
            $addFields: {
                numberOfFarmerOffers: { $size: '$farmeroffers' }, // Count of FarmerOffers
                // Procurement status based on FarmerOrders or FarmerOffers
                procurementStatus: {
                    $cond: [
                        // If the status is Ordered, set procurementStatus to 'received'
                        { $eq: ['$status', 'Ordered'] },
                        'received',
                        {
                            $cond: [
                                // If the status is Rejected, set procurementStatus to 'rejected'
                                { $eq: ['$status', 'Rejected'] },
                                'rejected',
                                {
                                    $cond: [
                                        // If the status is Pending, set procurementStatus to 'pending'
                                        { $eq: ['$status', 'Pending'] },
                                        'pending',
                                        {
                                            $cond: [
                                                // If all farmer orders are received, set procurementStatus to 'received'
                                                { $allElementsTrue: { $map: { input: '$farmerorders', as: 'offer', in: { $eq: ['$$offer.status', 'received'] } } } },
                                                'received',
                                                // If any farmer order is pending, set procurementStatus to 'pending'
                                                {
                                                    $cond: [
                                                        { $anyElementTrue: { $map: { input: '$farmerorders', as: 'offer', in: { $eq: ['$$offer.status', 'pending'] } } } },
                                                        'pending',
                                                        'in_progress' // Default procurementStatus if no other condition is met
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        },
        { $unwind: '$associate' },
        {
            $project: {
                _id: 1,
                offeredQty: 1,
                status: 1,
                numberOfFarmerOffers: 1, // Include the count of FarmerOffers
                procurementStatus: 1, // Include the calculated procurementStatus
                req_id: 1,
                // associate: { $arrayElemAt: ['$associate', 0] },
                'associate._id': 1,
                'associate.user_code': 1,
                'associate.basic_details.associate_details.associate_name': 1,
                'associate.basic_details.associate_details.organization_name': 1
            }
        },
        { $match: query }, // Apply query
        { $sort: sortBy },  // Sort by specified parameter
        { $skip: skip },    // Skip records for pagination
        { $limit: parseInt(limit) }, // Limit for pagination
    ]);

    records.count = await AssociateOffers.countDocuments(query);

    // start of Sangita code
    records.reqDetails = await RequestModel.findOne({ _id: req_id }).select({ _id: 0, reqNo: 1, product: 1, quotedPrice: 1, deliveryDate: 1, expectedProcurementDate: 1, fulfilledQty: 1, totalQuantity: 1 });
    // end of sangita code   

    if (paginate == 1) {
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }

    if (isExport == 1) {

        const record = records.rows.map((item) => {

            return {
                "Associate Id": item?.associate.user_code || "NA",
                "Associate Name": item?.associate.basic_details.associate_details.associate_name || "NA",
                "Quantity Proposed": item?.offeredQty || "NA",
                "Number of Farmers": item?.numberOfFarmerOffers || "NA",
                "Procurement Status": item?.procurementStatus || "NA",
                "Approval Status": item?.status || "NA",
            }
        })


        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `AsscoateOffer-${'AsscoateOffer'}.xlsx`,
                worksheetName: `AsscoateOffer-record-${'AsscoateOffer'}`
            });
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Assocaite Offer") }))

        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("procurement") }));

    }
});

module.exports.associateOfferbyid = asyncErrorHandler(async (req, res) => {
    const { id } = req.params

    const record = await AssociateOffers.findOne({ _id: id })
        .populate({ path: 'req_id', select: '_id product.name product.grade product.commodityImage reqNo deliveryDate' })
        .populate({ path: 'seller_id', select: '_id basic_details.associate_details.associate_name user_code basic_details.associate_details.organization_name' })
        .select('_id seller_id req_id offeredQty status procuredQty')

    if (!record) {
        return res.send(new serviceResponse({ status: 400, data: record, message: _response_message.notFound() }))
    }
    return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.found() }))
})

module.exports.getofferedFarmers = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, sortBy, search = '', associateOffers_id } = req.query

    let query = search ? {
        $or: [
            { "metaData.name": { $regex: search, $options: 'i' } },
            { "metaData.father_name": { $regex: search, $options: 'i' } },
            { "metaData.mobile_no": { $regex: search, $options: 'i' } },
        ]
    } : {};

    query.associateOffers_id = associateOffers_id;
    const records = { count: 0 };

    records.rows = await FarmerOffers.find(query)
        .sort(sortBy)
        .skip(skip)
        .populate({ path: 'farmer_id', select: '_id farmer_id farmer_code parents address basic_details.mobile_no' })
        .limit(parseInt(limit))
        .select('_id associateOffers_id farmer_id metaData offeredQty')

    records.count = await FarmerOffers.countDocuments(query);
    records.page = page
    records.limit = limit
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0

    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }))
})

module.exports.approveRejectOfferByAgent = asyncErrorHandler(async (req, res) => {
    const { user_id } = req;
    const { associateOffer_id, status, comments } = req.body;

    const offer = await AssociateOffers.findOne({ _id: associateOffer_id })
        .populate({ path: "req_id", select: "reqNo product" })
        .populate({ path: "seller_id", select: "basic_details" });

    if (!offer) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
    }

    if (!Object.values(_associateOfferStatus).includes(status)) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("status") }] }));
    }

    if (status == _associateOfferStatus.rejected && comments) {
        offer.comments.push({ user_id: user_id, comment: comments });
    } else if (status == _associateOfferStatus.accepted) {
        const existingRequest = await RequestModel.findOne({ _id: offer?.req_id });

        if (!existingRequest) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
        }

        existingRequest.fulfilledQty = handleDecimal(existingRequest.fulfilledQty + offer?.offeredQty);

        if (existingRequest.fulfilledQty == handleDecimal(existingRequest?.product?.quantity)) {
            existingRequest.status = _requestStatus.fulfilled;
        } else if (existingRequest.fulfilledQty < handleDecimal(existingRequest?.product?.quantity)) {
            // existingRequest.status = _requestStatus.partially_fulfilled;
            existingRequest.status = _requestStatus.partially_fulfulled;
        } else {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "this request cannot be processed! quantity exceeds" }] }));
        }

        await existingRequest.save();
    }

    offer.status = status;

    const farmerOffer = await FarmerOffers.find({ associateOffers_id: associateOffer_id, status: _status.active });

    for (let offered of farmerOffer) {
        const { associateOffers_id, farmer_id, metaData, offeredQty } = offered;
        const ExistFarmerOrders = await FarmerOrders.findOne({ associateOffers_id, farmer_id });
        if (!ExistFarmerOrders) {
            const newFarmerOrder = new FarmerOrders({
                associateOffers_id,
                farmer_id,
                metaData,
                offeredQty: handleDecimal(offeredQty),
                order_no: "OD" + _generateOrderNumber()
            });
            await newFarmerOrder.save();
        }
    }

    await offer.save();

    const subject = `New Approval Request Received for Quantity Proposed`;
    const body = `<p> Dear <Admin> </p> <br/> 
                <p> You have received a New Approval request for the quantity proposed by the associate under the following details: </p> <br/> 
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>Order ID</th>
                    <td> ${offer?.req_id.reqNo} </td>
                </tr>
                <tr>
                    <th> Associate ID </th>
                    <td> ${offer?.seller_id.user_code}</td>
                </tr>
                <tr>
                    <th> Associate Name </th>
                    <td> ${offer?.seller_id.basic_details.associate_details.associate_name} </td>
                </tr>
                <tr>
                    <th>Commodity </th>
                    <td> ${offer?.req_id.product.name}</td>
                </tr>
                <tr>
                    <th> Quantity Proposed </th>
                    <td> ${handleDecimal(offer?.req_id.product.quantity)} </td>
                </tr>
                </table> <br/>
                <p> Please review the request and approve or reject it by clicking on the following link: <a href="https://ep-testing.navbazar.com/requirements/requests">Click here</a> </p> <br/> 
                <p> Thank you for your prompt attention to this matter. </p> <br/> 
                <p> Need Help?  </p> <br/> 
                <p> For queries or any assistance, contact us at ${offer?.seller_id.basic_details.associate_details.phone} </p> <br/> 
                <p> Warm regards,  </p> <br/> 
                <p> Navankur. </p> `;

    await sendMail("ashita@navankur.org", "", subject, body);

    return res.status(200).send(new serviceResponse({ status: 200, data: offer, message: _response_message.updated("offer") }));

});

module.exports.getProcurementById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const record = await RequestModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
    }

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("order") }))
})

module.exports.updateRequirement = asyncErrorHandler(async (req, res) => {

    const { id, name, grade, quantity, msp, delivery_date, procurement_date, expiry_date, ho, bo, warehouse_id, commodity_image, schemeId, commodity_id, standard, substandard, sla_id } = req.body;

    const record = await RequestModel.findOne({ _id: id }).populate("head_office_id").populate("branch_id");

    const associateOffer = await AssociateOffers.find({ req_id: id });

    if (associateOffer.length != 0) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.allReadyExist("associate offer") }));
    }

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("request") }));
    }

    if (!record.branch_id) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("branch office") }));
    }

    if (!record.head_office_id) {
        return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound("head office") }));
    }

    record.product.name = name;
    record.product.grade = grade;
    record.product.schemeId = schemeId;
    record.product.commodity_id = commodity_id;
    record.product.standard = standard;
    record.product.substandard = substandard;
    record.sla_id = sla_id;
    record.product.quantity = handleDecimal(quantity);
    record.quotedPrice = handleDecimal(msp);
    record.deliveryDate = delivery_date;
    record.expectedProcurementDate = procurement_date;
    record.quoteExpiry = expiry_date;
    // record.head_office_id.company_details.name = ho;
    // record.branch_id.branchName = bo;
    record.head_office_id = ho;
    record.branch_id = bo;
    // record.address.locationUrl = url;
    record.warehouse_id = warehouse_id;
    record.product.commodityImage = commodity_image;

    await record.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("request") }));
});

module.exports.deleteRequirement = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const record = await RequestModel.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Requirement") }] }))
    }

    await record.deleteOne();

    return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.deleted("Requirement") }));
});

module.exports.getWareHouse = asyncErrorHandler(async (req, res) => {
    const { page, limit, skip, sortBy, paginate } = req.query
    const records = { count: 0 };
    const query = {};
    records.count = await wareHouseDetails.countDocuments();
    if (paginate == 1) {
        records.rows = await wareHouseDetails.find(query).select({ addressDetails: 1 })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))
        records.page = page
        records.limit = limit
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
    } else {
        records.rows = await wareHouseDetails.find(query).select({ addressDetails: 1, "basicDetails.warehouseName": 1 })
            .sort(sortBy)
    }
    return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found() }))
})

module.exports.getScheme = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery
    let matchQuery = {
        deletedAt: null
    };
    if (search) {
        matchQuery.schemeId = { $regex: search, $options: "i" };
    }
    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $project: {
                _id: 1,
                schemeId: 1,
                schemeName: 1,
                Schemecommodity: 1,
                season: 1,
                period: 1,
                procurement: 1
            }
        }
    ];
    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, // Secondary sort by _id for stability
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },);
    }
    const rows = await Scheme.aggregate(aggregationPipeline);
    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];
    const countResult = await Scheme.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;
    const records = { rows, count };
    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }
    if (isExport == 1) {
        const record = rows.map((item) => {
            return {
                "Scheme Id": item?.schemeId || "NA",
                "scheme Name": item?.schemeName || "NA",
                "SchemeCommodity": item?.commodity || "NA",
                "season": item?.season || "NA",
                "period": item?.period || "NA",
                "procurement": item?.procurement || "NA"
            };
        });
        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Scheme-record.xlsx`,
                worksheetName: `Scheme-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Scheme") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Scheme") }));
    }
});

module.exports.getCommodity = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;
    const { user_id } = req;
    // Initialize matchQuery
    let matchQuery = {
        deletedAt: null
    };
    if (search) {
        matchQuery.commodityId = { $regex: search, $options: "i" };
    }
    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $project: {
                _id: 1,
                commodityId: 1,
                name: 1,
                status: 1,
                commodityType: 1,
            }
        }
    ];
    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, // Secondary sort by _id for stability
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },);
    }
    const rows = await Commodity.aggregate(aggregationPipeline);
    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];
    const countResult = await Commodity.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;
    const records = { rows, count };
    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }
    if (isExport == 1) {
        const record = rows.map((item) => {
            return {
                "Order Id": item?.order_id || "NA",
                "BO Name": item?.branchName || "NA",
                "Commodity": item?.commodity || "NA",
                "Grade": item?.grade || "NA",
                "Quantity": item?.quantityRequired || "NA",
                "Total Amount": item?.totalAmount || "NA",
                "Total Penalty Amount": item?.totalPenaltyAmount || "NA",
                "Payment Status": item?.paymentStatus || "NA"
            };
        });
        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Commodity-record.xlsx`,
                worksheetName: `Commodity-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Commodity") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Commodity") }));
    }
});

module.exports.schemeCommodity = asyncErrorHandler(async (req, res) => {
    const { scheme_id, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery
    let matchQuery = {
        _id: new mongoose.Types.ObjectId(scheme_id),
        deletedAt: null
    };
    if (search) {
        matchQuery.schemeId = { $regex: search, $options: "i" };
    }
    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'commodities',
                localField: 'commodity_id',
                foreignField: '_id',
                as: 'commodityDetails',
            },
        },
        { $unwind: { path: '$commodityDetails', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'commoditystandards',
                localField: 'commodityDetails.commodityStandard_id',
                foreignField: '_id',
                as: 'commoditystandardsDetails',
            },
        },
        { $unwind: { path: '$commoditystandardsDetails', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                // schemeId: 1,
                schemeName: 1,
                Schemecommodity: 1,
                procurement: 1,
                comodity_id: "$commodityDetails._id",
                commodityName: "$commodityDetails.name",
                standard: "$commoditystandardsDetails.name",
                subStandard: "$commoditystandardsDetails.subName"
            }
        }
    ];
    if (paginate == 1) {
        aggregationPipeline.push(
            { $sort: { [sortBy || 'createdAt']: -1, _id: -1 } }, // Secondary sort by _id for stability
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        );
    } else {
        aggregationPipeline.push({ $sort: { [sortBy || 'createdAt']: -1, _id: -1 } },);
    }

    const rows = await Scheme.aggregate(aggregationPipeline);
    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];
    const countResult = await Scheme.aggregate(countPipeline);
    const count = countResult[0]?.total || 0;
    const records = { rows, count };
    if (paginate == 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
    }
    if (isExport == 1) {
        const record = rows.map((item) => {
            return {
                "Scheme Id": item?.schemeId || "NA",
                "scheme Name": item?.schemeName || "NA",
                "SchemeCommodity": item?.commodity || "NA",
                "season": item?.season || "NA",
                "period": item?.period || "NA",
                "procurement": item?.procurement || "NA"
            };
        });
        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Scheme-record.xlsx`,
                worksheetName: `Scheme-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Scheme") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Scheme") }));
    }
});