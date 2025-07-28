const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { _userType, _userStatus, _requestStatus, _paymentApproval, _procuredStatus, _associateOfferStatus, _paymentstatus } = require("@src/v1/utils/constants");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel, handleDecimal } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const xlsx = require('xlsx');
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const Joi = require('joi');
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
// const jformIds = require('../jform_ids');
// const jformIds = require('../remaining_jformIds');
const jformIds = require('../50kg-jformId');
// const jformIds = require('../jformIdRemaining(07-19-2025)');
// const checkJformIdsExist = require('../allJformIds');
// const checkJformIdsExist = require('../paymentExistingInEkhridTeam');
// const checkJformIdsExist = require('../rajveerSheet');
const checkJformIdsExist = require('../finalJformIds(02-07-2025)');
// const checkJformIdsExist = require('../remainingJformIds(15-07-2025)');
const needToUpdateAssociateJformIds = require('../needToUpdateAssociateJformIds');
const jformIdDeleted = require('../jformidDeleted');
const { AssociateMandiName } = require("@src/v1/models/app/eKharid/associateMandiName");
const { error } = require('console');

module.exports.getAssociates = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sortBy, isExport = 0 } = req.query;
        const skip = (page - 1) * limit;

        // Build the query for searching/filtering associates
        let matchQuery = {
            user_type: _userType.associate,
            is_approved: _userStatus.approved,
            ekhridUser: true
            // bank_details: { $ne: null }
        };

        // If there's a search term, add it to the match query
        if (search) {
            matchQuery['basic_details.associate_details.associate_name'] = { $regex: search, $options: 'i' };
        }

        // Aggregation pipeline to join farmers and procurement centers and get counts
        const records = await User.aggregate([
            { $match: matchQuery },
            { $sort: sortBy }, // Sort by the provided field
            // { $skip: skip }, 
            // { $limit: parseInt(limit) }, 

            // Lookup to count associated farmers
            {
                $lookup: {
                    from: 'farmers', // Collection name for farmers
                    localField: '_id',
                    foreignField: 'associate_id',
                    as: 'farmers'
                }
            },
            {
                $addFields: {
                    farmersCount: { $size: '$farmers' } // Get the count of farmers
                }
            },
            // Lookup to count associated procurement centers
            {
                $lookup: {
                    from: 'procurementcenters', // Collection name for procurement centers
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'procurementCenters'
                }
            },
            {
                $addFields: {
                    procurementCentersCount: { $size: '$procurementCenters' } // Get the count of procurement centers
                }
            },
            {
                $project: {
                    farmers: 0,
                    procurementCenters: 0 // Exclude the procurement centers array
                }
            }
        ]);
        // Get total count of documents for pagination purposes
        const totalRecords = await User.countDocuments(matchQuery);
        // Pagination information
        const totalPages = Math.ceil(totalRecords / limit);


        if (isExport == 1) {
            const record = records.map((item) => {
                const { name, email, mobile } = item?.basic_details.point_of_contact;

                const { line1, line2, district, state, country } = item.address.registered

                return {
                    "Associate Id": item?.user_code || "NA",
                    "Associate Name": item?.basic_details.associate_details.associate_name || "NA",
                    "Associated Farmer": item?.farmersCount || "NA",
                    "Procurement Center": item?.procurementCentersCount || "NA",
                    "Point Of Contact": `${name} , ${email} , ${mobile}` || "NA",
                    "Address": `${line1} , ${line2} , ${district} , ${state} , ${country}` || "NA",
                    "Status": item?.active || "NA",
                }
            })

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-${'Associate'}.xlsx`,
                    worksheetName: `Associate-record-${'Associate'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate") }))
            }
        }
        else {

            return res.status(200).send(new serviceResponse({
                status: 200,
                data: {
                    rows: records,
                    count: totalRecords,
                    page: page,
                    limit: limit,
                    pages: totalPages
                },
                message: _response_message.found("associates")
            }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateOrInsertUsers = async (req, res) => {
    try {
        // Fetch unique commission agent names and farmer IDs from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            {
                $group: {
                    _id: "$procurementDetails.commisionAgentName",
                    farmerId: { $first: "$procurementDetails.farmerID" } // Fetch first farmerId per commission agent
                }
            },
            {
                $match: {
                    _id: { $ne: null }, farmerId: { $ne: null },
                    "procurementDetails.offerCreatedAt": null
                }
            }
        ]);

        if (!procurements.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "No valid commission agent names or farmer IDs found."
            }));
        }

        const userBulkOps = [];
        const farmerBulkOps = [];

        // Fetch the last user_code from the User collection
        const lastUser = await User.findOne(
            { user_code: /^AS\d+$/ }, // Ensures only user_codes matching ASxxxxx pattern
            { user_code: 1 }
        ).sort({ user_code: -1 });

        let lastCodeNumber = 1; // Default if no users exist

        if (lastUser?.user_code) {
            const numericPart = parseInt(lastUser.user_code.replace(/\D/g, ""), 10);
            lastCodeNumber = isNaN(numericPart) ? 1 : numericPart + 1;
        }

        for (const procurement of procurements) {

            const commisionAgentName = procurement._id;
            const farmerId = procurement.farmerId;

            // Generate the next user_code in sequence
            const nextUserCode = `AS${String(lastCodeNumber).padStart(5, '0')}`;
            lastCodeNumber++; // Increment for next user

            // Push bulk operation for User collection
            userBulkOps.push({
                updateOne: {
                    filter: { "basic_details.associate_details.organization_name": commisionAgentName },
                    update: {
                        $set: {
                            "basic_details.associate_details.organization_name": commisionAgentName,
                            ekhridUser: true,
                            client_id: "9877",
                            user_type: _userType.associate,
                            is_approved: _userStatus.approved,
                            user_code: nextUserCode
                        }
                    },
                    upsert: true
                }
            });

        }

        // Execute bulk operations
        let userBulkUpdated = {}
        if (userBulkOps.length > 0) {
            userBulkUpdated = await User.bulkWrite(userBulkOps);
        }
        let farmerBulkUpdated = {}
        if (farmerBulkOps.length > 0) {
            farmerBulkUpdated = await farmer.bulkWrite(farmerBulkOps);
        }

        return res.send(new serviceResponse({
            status: 200,
            data: { userBulkUpdated, farmerBulkUpdated },
            message: _response_message.found("Associates uploaded successfully"),
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateOrInsertUsersTesting = async (req, res) => {
    try {
        // Fetch unique commission agent names and farmer IDs from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            {
                $group: {
                    _id: "$procurementDetails.commisionAgentName",
                    farmerId: { $first: "$procurementDetails.farmerID" } // Fetch first farmerId per commission agent
                }
            },
            {
                $match: {
                    _id: { $ne: null }, farmerId: { $ne: null },
                    //  "procurementDetails.offerCreatedAt": null 
                }
            }
        ]);

        if (!procurements.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "No valid commission agent names or farmer IDs found."
            }));
        }

        const userBulkOps = [];

        for (const procurement of procurements) {
            const commisionAgentName = procurement._id;
            const existingUser = await User.findOne({ "basic_details.associate_details.organization_name": commisionAgentName });
            if (!existingUser) {
                userBulkOps.push({
                    associate_details: commisionAgentName
                });

            }

        }

        return res.send(new serviceResponse({
            status: 200,
            data: { userBulkOps, count: userBulkOps.length, },
            message: _response_message.found("Associates uploaded successfully"),
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.addFarmers = async (req, res) => {
    try {
        // Fetch unique farmer IDs and jForm IDs from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            {
                $match: {
                    // "procurementDetails.commisionAgentName": "HAFED",
                    "procurementDetails.commisionAgentName": "SWARAJ FEDERATION OF MULTIPURPOSE COOP SOCIETY LTD",
                    // "procurementDetails.commisionAgentName": "FARMERS CONSORTIUM FOR AGRICULTURE &ALLIED SEC HRY",
                    "procurementDetails.farmerID": { $ne: null }, // Ensure farmerID is not null
                    // "procurementDetails.offerCreatedAt": null
                    $or: [
                        { "procurementDetails.offerCreatedAt": { $eq: null } }, // offerCreatedAt is null
                        { "procurementDetails.offerCreatedAt": { $exists: false } } // offerCreatedAt does not exist
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "procurementDetails.commisionAgentName",
                    foreignField: "basic_details.associate_details.organization_name",
                    as: "associateDetails"
                }
            },
            {
                $unwind: "$associateDetails"
            },
            {
                $project: {
                    _id: 0,
                    farmerId: "$procurementDetails.farmerID",
                    jformID: "$procurementDetails.jformID",
                    associateDetailsId: "$associateDetails._id"
                }
            }
        ]);

        if (!procurements.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "No valid commission agent names or farmer IDs found."
            }));
        }

        const farmerBulkOps = [];

        for (const procurement of procurements) {

            // const commisionAgentName = procurement._id;
            const farmerId = procurement.farmerId;
            const jformId = procurement.jformID;
            const associateDetailsId = procurement.associateDetailsId;
            // Check if the farmer exists
            const existingFarmer = await farmer.findOne({ external_farmer_id: farmerId });

            if (!existingFarmer) {
                // Insert a new farmer record if not found
                farmerBulkOps.push({
                    insertOne: {
                        document: {
                            external_farmer_id: farmerId,
                            farmer_type: "Associate",
                            farmer_id: jformId,
                            associate_id: associateDetailsId,
                            ekhrid: true
                        }
                    }
                });
            }
        }

        // Execute bulk operations
        let farmerBulkUpdated = null;
        if (farmerBulkOps.length > 0) {
            farmerBulkUpdated = await farmer.bulkWrite(farmerBulkOps);
        }

        return res.send(new serviceResponse({
            status: 200,
            data: farmerBulkUpdated,
            message: _response_message.found("Farmers uploaded successfully"),
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.addProcurementCenter = async (req, res) => {
    try {
        // Fetch unique farmer IDs and jForm IDs from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            {
                $match: {
                    "procurementDetails.commodityName": "Sunflower",
                    // "procurementDetails.commisionAgentName":"SWARAJ FEDERATION OF MULTIPURPOSE COOP SOCIETY LTD",
                    // "procurementDetails.commisionAgentName": "FARMERS CONSORTIUM FOR AGRICULTURE &ALLIED SEC HRY",
                    "procurementDetails.commisionAgentName": "HAFED",
                    "procurementDetails.mandiName": { $ne: null },
                    // "procurementDetails.centerCreatedAt": null
                    $or: [
                        { "procurementDetails.centerCreatedAt": { $eq: null } }, // batchCreatedAt is null
                        { "procurementDetails.centerCreatedAt": { $exists: false } } // batchCreatedAt does not exist
                    ]
                }
            },
            {
                $group: {
                    _id: "$procurementDetails.mandiName",
                    commisionAgentName: { $first: "$procurementDetails.commisionAgentName" }
                }
            },
            {
                $match: { _id: { $ne: null }, commisionAgentName: { $ne: null } }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "commisionAgentName",
                    foreignField: "basic_details.associate_details.organization_name",
                    as: "associateDetails"
                }
            },
            {
                $project: {
                    _id: 0,
                    mandiName: "$_id",
                    associateDetailsId: { $arrayElemAt: ["$associateDetails._id", 0] }, // Extract first match
                    commisionAgentName: 1
                }
            }
        ]);


        if (!procurements.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "No valid mandi names or commission agent names found."
            }));
        }

        const newCenters = [];
        const eKharidUpdates = [];

        const CenterCodeFn = async () => {
            let CenterCode = "";
            let isUnique = false;
            const lastCenter = await ProcurementCenter.findOne({ center_code: { $exists: true } }).sort({ center_code: -1 });

            if (lastCenter && lastCenter.center_code) {
                const lastCodeNumber = parseInt(lastCenter.center_code.slice(2), 10);
                CenterCode = "CC" + String(lastCodeNumber + 1).padStart(5, "0");
            } else {
                CenterCode = "CC00001";
            }

            // Ensure uniqueness by checking existing center codes
            while (!isUnique) {
                const existingCenter = await ProcurementCenter.findOne({ center_code: CenterCode });
                if (!existingCenter) {
                    isUnique = true; // No conflict found, code is unique
                } else {
                    // Increment the number and regenerate CenterCode
                    const currentCodeNumber = parseInt(CenterCode.slice(2), 10);
                    CenterCode = "CC" + String(currentCodeNumber + 1).padStart(5, "0");
                }
            }
            return CenterCode;
        }
        // Get the last center code and generate the next one
        for (const procurement of procurements) {
            const mandiName = procurement.mandiName;
            const associateDetailsId = procurement.associateDetailsId;

            // Check if the center exists
            const existingCenter = await ProcurementCenter.findOne({ center_name: mandiName });
            if (!existingCenter) {
                // Insert a new center record if not found
                const centerCode = await CenterCodeFn();
                const updateProcurementCenter = await ProcurementCenter.create({
                    center_name: mandiName,
                    center_code: centerCode,
                    user_id: associateDetailsId,
                    center_type: "associate",
                    address: {
                        line1: "NA",
                        line2: "NA",
                        country: "India",
                        state: "Haryana",
                        district: "NA",
                        city: "NA",
                        postalCode: "NA",
                        lat: "NA",
                        long: "NA"
                    },
                    point_of_contact: {
                        name: "NA",
                        email: `${mandiName}32@gmail.com`,
                        mobile: "NA",
                        designation: "NA",
                        aadhar_number: "NA",
                        aadhar_image: "NA"
                    },
                    location_url: "NA",
                    addressType: "Residential",
                    isPrimary: false,
                    ekhrid: true
                });
                const data = await updateProcurementCenter.save();
                newCenters.push(data);
            }
            //update eKharid record by mandiName manyUpdate
            eKharidUpdates.push({
                updateMany: {
                    filter: { "procurementDetails.mandiName": mandiName },
                    update: { $set: { "procurementDetails.centerCreatedAt": new Date() } }
                }
            });
        }




        // // Execute bulk operations
        let eKharidUpdatedData = []
        if (eKharidUpdates.length > 0) {
            eKharidUpdatedData = await eKharidHaryanaProcurementModel.bulkWrite(eKharidUpdates);
        }
        // if (newCenters.length > 0) {
        //     await ProcurementCenter.insertMany(newCenters);
        // }

        return res.send(new serviceResponse({
            status: 200,
            data: { procurements, eKharidUpdatedData, newCenters },
            message: _response_message.found("Procurement center uploaded successfully"),
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getProcurementCenter = async (req, res) => {
    try {

        let matchQuery = {
            center_type: "associate",
            ekhrid: true
        };

        // Aggregation pipeline to join farmers and procurement centers and get counts
        const records = await ProcurementCenter.aggregate([
            { $match: matchQuery },
            {
                $project: {
                    _id: 1,
                    center_name: 1,
                    center_code: 1,
                    ekhrid: 1
                }
            }
        ]);
        const totalRecords = await ProcurementCenter.countDocuments(matchQuery);
        return res.status(200).send(new serviceResponse({
            status: 200,
            data: {
                rows: records,
                count: totalRecords,
            },
            message: _response_message.found("procurement centers")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getProcurementCenterTesting = async (req, res) => {
    try {
        // Fetch unique farmer IDs and jForm IDs from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            {
                $match: {
                    "procurementDetails.mandiName": { $ne: null },
                    // "procurementDetails.centerCreatedAt": null
                }
            },
            {
                $group: {
                    _id: "$procurementDetails.mandiName",
                    commisionAgentName: { $first: "$procurementDetails.commisionAgentName" }
                }
            },
            {
                $match: { _id: { $ne: null }, commisionAgentName: { $ne: null } }
            },

            {
                $project: {
                    _id: 0,
                    mandiName: "$_id",
                    commisionAgentName: 1
                }
            }
        ]);


        if (!procurements.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "No valid mandi names or commission agent names found."
            }));
        }

        const newCenters = [];

        // Get the last center code and generate the next one
        for (const procurement of procurements) {
            const mandiName = procurement.mandiName;
            const associateDetailsId = procurement.associateDetailsId;

            // Check if the center exists
            const existingCenter = await ProcurementCenter.findOne({ center_name: mandiName });
            if (!existingCenter) {
                // Insert a new center record if not found
                newCenters.push({
                    center_name: mandiName,
                });
            }
        }
        return res.send(new serviceResponse({
            status: 200,
            data: { newCenters, count: newCenters.length, },
            message: _response_message.found("Procurement center uploaded successfully"),
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.associateFarmerList = async (req, res) => {
    let jfomIds = jformIds.slice(0, 110191);

    const { associateName } = req.body;
    console.log("associateName",associateName)

    try {
        // Match filter
        const query = {
            'procurementDetails.commisionAgentName': associateName,
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            "procurementDetails.jformID": { $in: jfomIds },
            // "procurementDetails.notIncludedJformId": { $ne: true },
            $or: [
                { "procurementDetails.offerCreatedAt": null },
                { "procurementDetails.offerCreatedAt": { $exists: false } }
            ]
        };

        const procurements = await eKharidHaryanaProcurementModel.find(query).limit(1000).lean();
        // const procurements = await eKharidHaryanaProcurementModel.find(query).lean();
        console.log("procurements",procurements.length);
        if (!procurements.length) return [];

        const farmerIDs = [];
        const mandiNames = new Set();
        const agentNames = new Set();

        for (const p of procurements) {
            if (p?.procurementDetails?.farmerID) {
                farmerIDs.push(p.procurementDetails.farmerID.toString());
            }
            if (p?.procurementDetails?.mandiName) {
                mandiNames.add(p.procurementDetails.mandiName);
            }
            if (p?.procurementDetails?.commisionAgentName) {
                agentNames.add(p.procurementDetails.commisionAgentName);
            }
        }


        const farmers = await farmer.find({
            external_farmer_id: { $in: farmerIDs }
        }, { _id: 1, external_farmer_id: 1 }).lean();

        const procurementCenters = await ProcurementCenter.find({
            center_name: { $in: [...mandiNames] }
        }, { _id: 1, center_name: 1 }).lean();

        const users = await User.find({
            "basic_details.associate_details.organization_name": { $in: [...agentNames] }
        }, { _id: 1, "basic_details.associate_details.organization_name": 1 }).lean();


        const farmerMap = new Map(farmers.map(f => [f.external_farmer_id.toString(), f]));
        const centerMap = new Map(procurementCenters.map(c => [c.center_name, c._id]));
        const userMap = new Map(users.map(u => [u.basic_details.associate_details.organization_name, u._id]));


        const groupMap = {};

        for (const doc of procurements) {
            const procurement = doc.procurementDetails;
            if (!procurement) continue;

            const warehouseData = doc.warehouseData;
            if (!warehouseData) continue;

            const agentName = procurement.commisionAgentName || 'UNKNOWN';
            const farmerIdStr = procurement.farmerID?.toString();
            const farmerObj = farmerMap.get(farmerIdStr) || null;
            const procurementCenterId = centerMap.get(procurement.mandiName) || null;
            const userId = userMap.get(agentName) || null;

            // const qty = (procurement.gatePassWeightQtl || 0) / 10;
            const qty = (procurement.JformFinalWeightQtl || 0) / 10;

            if (!groupMap[agentName]) {
                groupMap[agentName] = {
                    _id: agentName,
                    seller_id: userId,
                    farmer_data: [],
                    total_farmers: 0,
                    total_ekhrid_farmers: 0,
                    qtyOffered: 0
                };
            }

            const group = groupMap[agentName];

            group.farmer_data.push({
                _id: farmerObj?._id || null,
                qty,
                // gatePassID: procurement.gatePassID,
                // exitGatePassId: warehouseData.exitGatePassId,
                jformID: procurement.jformID,
                jformDate: procurement.jformDate,
                procurementId: procurementCenterId
            });

            if (farmerObj?._id) group.total_farmers += 1;
            if (procurement.farmerID) group.total_ekhrid_farmers += 1;
            group.qtyOffered += qty;
        }


        let groupedData = Object.values(groupMap).slice(0, 1);

        if (groupedData.length > 0) {
            const group = groupedData[0];
            const uniqueFarmers = {};
            const uniqueFarmerData = [];

            let totalQty = 0;

            for (const item of group.farmer_data) {
                const id = item._id?.toString();
                // if (id && !uniqueFarmers[id]) {
                //     uniqueFarmers[id] = true;
                //     uniqueFarmerData.push(item);
                //     totalQty += item.qty || 0;
                // }

                uniqueFarmers[id] = true;
                uniqueFarmerData.push(item);
                totalQty += item.qty || 0;
            }

            group.farmer_data = uniqueFarmerData;
            group.total_farmers = uniqueFarmerData.length;
            group.qtyOffered = totalQty;
        }


        return res.send(
            new serviceResponse({
                status: 200,
                data: groupedData,
                // data: groupedDataResult,
                message: _response_message.found("Associate farmer"),
            })
        );

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

/*
module.exports.createOfferOrder = async (req, res) => {
    try {
        const { req_id, seller_id, farmer_data = [], qtyOffered } = req.body;

        const existingProcurementRecord = await RequestModel.findOne(
            { _id: new mongoose.Types.ObjectId(req_id) },
            { fulfilledQty: 1, product: 1 } // Fetch only necessary fields
        ).lean();

        if (!existingProcurementRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
        }

        const existingRecord = await AssociateOffers.findOne(
            { seller_id: new mongoose.Types.ObjectId(seller_id), req_id: new mongoose.Types.ObjectId(req_id) },
            { offeredQty: 1 }
        ).lean();

        // const sumOfFarmerQty = farmer_data.reduce((acc, curr) => acc + handleDecimal(curr.qty), 0);
        const sumOfFarmerQty = farmer_data.reduce((acc, curr) => acc + curr.qty, 0);
        if (handleDecimal(sumOfFarmerQty) !== handleDecimal(qtyOffered)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Please check details! Quantity mismatched" }] }));
        }

        const { fulfilledQty, product } = existingProcurementRecord;
        // if (qtyOffered > (product.quantity - fulfilledQty)) {
        //     return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Incorrect quantity of request" }] }));
        // }

        // Fetch all farmers in a single query
        const farmerIds = farmer_data.map(farmer => new mongoose.Types.ObjectId(farmer._id));
        const farmers = await farmer.find({ _id: { $in: farmerIds } }).lean();

        // Create a mapping for quick lookup
        const farmerMap = new Map(farmers.map(f => [f._id.toString(), f]));

        // Convert external_farmer_id to both String and Number for querying eKharid
        const externalFarmerIdsString = farmers.map(f => String(f.external_farmer_id));  // Convert to String
        const externalFarmerIdsNumber = farmers.map(f => Number(f.external_farmer_id)).filter(n => !isNaN(n));  // Convert to Number & remove NaN values

        // console.log("🔍 Querying eKharid for farmer IDs:", { externalFarmerIdsString, externalFarmerIdsNumber }); // Debugging

        const eKharidRecords = await eKharidHaryanaProcurementModel.find({
            $or: [
                { "procurementDetails.farmerID": { $in: externalFarmerIdsString } },  // Match as String
                { "procurementDetails.farmerID": { $in: externalFarmerIdsNumber } }   // Match as Number
            ]
        }).lean(); // Use lean() for performance

        console.log(" eKharid Records Found:", eKharidRecords.map(r => r.procurementDetails.farmerID)); // Debugging

        // Create a mapping for quick lookup
        const eKharidMap = new Map(eKharidRecords.map(record => [String(record.procurementDetails.farmerID), record]));

        let associateOfferRecord = existingRecord;

        if (existingRecord) {
            const updatedQty = (existingRecord.offeredQty || 0) + qtyOffered;
            console.log("Updating existing record");
            await AssociateOffers.updateOne(
                { _id: existingRecord._id },
                {
                    offeredQty: updatedQty,
                    procuredQty: updatedQty
                }
            );
        } else {
            console.log("Creating new record");
            associateOfferRecord = await AssociateOffers.create({
                seller_id,
                req_id,
                offeredQty: qtyOffered,
                procuredQty: qtyOffered,
                createdBy: seller_id,
                status: _associateOfferStatus.accepted
            });
        }

        // Update RequestModel fulfilledQty in one go
        const updatedFulfilledQty = (fulfilledQty + sumOfFarmerQty);
        let newStatus = _requestStatus.partially_fulfulled;
        // if (updatedFulfilledQty === handleDecimal(product.quantity)) {
        newStatus = _requestStatus.fulfilled;
        // } 
        // else if (updatedFulfilledQty > handleDecimal(product.quantity)) {
        //     return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "This request cannot be processed! Quantity exceeds" }] }));
        // }

        await RequestModel.updateOne({ _id: req_id }, { fulfilledQty: updatedFulfilledQty, status: newStatus });

        // Prepare bulk insert operations
        const farmerOrdersToInsert = [];
        const farmerOffersToInsert = [];
        const eKharidUpdates = [];

        for (let harvester of farmer_data) {
            const existingFarmer = farmerMap.get(harvester._id.toString());
            if (!existingFarmer) continue;

            const eKharidRecord = eKharidMap.get(String(existingFarmer.external_farmer_id));
            console.log("🔍 eKharid Record Found:", eKharidRecord); // Debugging
            if (!eKharidRecord) {
                // console.log(`No eKharid record found for farmerId: ${existingFarmer.external_farmer_id}`);
                // return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: `No procurement record found for farmerId: ${existingFarmer.external_farmer_id}` }] }));
            }

            // Prepare metadata
            const metaData = {
                name: existingFarmer.name,
                father_name: existingFarmer.father_name,
                address_line: existingFarmer.address_line,
                mobile_no: existingFarmer.mobile_no,
                farmer_code: existingFarmer.farmer_code
            };

            // Insert order and offer data
            farmerOrdersToInsert.push({
                associateOffers_id: associateOfferRecord._id,
                farmer_id: harvester._id,
                metaData,
                offeredQty: handleDecimal(harvester.qty),
                order_no: harvester.jformID,
                status: _procuredStatus.received,
                gatePassID: harvester.gatePassID,
                exitGatePassId: harvester.exitGatePassId,
                createdAt: harvester.createdAt,
                procurementCenter_id: harvester.procurementId,
                ekhrid: true
            });

            farmerOffersToInsert.push({
                associateOffers_id: associateOfferRecord._id,
                farmer_id: harvester._id,
                metaData,
                offeredQty: handleDecimal(harvester.qty),
                createdBy: seller_id,
                ekhrid: true
            });

            // Prepare eKharid update

            eKharidUpdates.push({
                updateOne: {
                    // filter: { "procurementDetails.farmerID": { $in: [String(existingFarmer.external_farmer_id), Number(existingFarmer.external_farmer_id)] } },
                    filter: { "procurementDetails.jformID": { $in: harvester.jformID } },
                    update: { $set: { "procurementDetails.offerCreatedAt": new Date() } }
                }
            });
        }

        // Perform batch inserts and updates
        if (farmerOrdersToInsert.length) await FarmerOrders.insertMany(farmerOrdersToInsert);
        if (farmerOffersToInsert.length) await FarmerOffers.insertMany(farmerOffersToInsert);
        if (eKharidUpdates.length) await eKharidHaryanaProcurementModel.bulkWrite(eKharidUpdates);

        res.status(200).send(new serviceResponse({ status: 200, message: "Offer created successfully" }));
    } catch (error) {
        console.error("❌ Error in createOfferOrder:", error);
        _handleCatchErrors(error, res);
    }
};
*/

module.exports.createOfferOrder = async (req, res) => {
    try {
        const { req_id, seller_id, farmer_data = [], qtyOffered } = req.body;

        const existingProcurementRecord = await RequestModel.findOne(
            { _id: new mongoose.Types.ObjectId(req_id) },
            { fulfilledQty: 1, product: 1 }
        ).lean();

        if (!existingProcurementRecord) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }));
        }

        const existingRecord = await AssociateOffers.findOne(
            { seller_id: new mongoose.Types.ObjectId(seller_id), req_id: new mongoose.Types.ObjectId(req_id) },
            { offeredQty: 1 }
        ).lean();

        const sumOfFarmerQty = farmer_data.reduce((acc, curr) => acc + curr.qty, 0);
        if (handleDecimal(sumOfFarmerQty) !== handleDecimal(qtyOffered)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Please check details! Quantity mismatched" }] }));
        }

        const { fulfilledQty, product } = existingProcurementRecord;

        // Fetch all farmers in a single query
        const farmerIds = farmer_data.map(f => new mongoose.Types.ObjectId(f._id));
        const farmers = await farmer.find({ _id: { $in: farmerIds } }).lean();
        const farmerMap = new Map(farmers.map(f => [f._id.toString(), f]));

        // Fetch eKharid records using jformIDs
        const jformIDs = farmer_data.map(f => f.jformID).filter(Boolean);
        const eKharidRecords = await eKharidHaryanaProcurementModel.find({
            "procurementDetails.jformID": { $in: jformIDs }
        }).lean();

        const eKharidMapByJformID = new Map(
            eKharidRecords.map(r => [r.procurementDetails.jformID, r])
        );

        let associateOfferRecord = existingRecord;

        if (existingRecord) {
            const updatedQty = (existingRecord.offeredQty || 0) + qtyOffered;
            await AssociateOffers.updateOne(
                { _id: existingRecord._id },
                {
                    offeredQty: updatedQty,
                    procuredQty: updatedQty
                }
            );
        } else {
            associateOfferRecord = await AssociateOffers.create({
                seller_id,
                req_id,
                offeredQty: qtyOffered,
                procuredQty: qtyOffered,
                createdBy: seller_id,
                status: _associateOfferStatus.accepted
            });
        }

        const updatedFulfilledQty = fulfilledQty + sumOfFarmerQty;
        let newStatus = _requestStatus.fulfilled;

        await RequestModel.updateOne({ _id: req_id }, { fulfilledQty: updatedFulfilledQty, status: newStatus });

        const farmerOrdersToInsert = [];
        const farmerOffersToInsert = [];
        const eKharidUpdates = [];

        for (let harvester of farmer_data) {
            const existingFarmer = farmerMap.get(harvester._id.toString());
            if (!existingFarmer) continue;

            const eKharidRecord = eKharidMapByJformID.get(harvester.jformID);
            if (!eKharidRecord) continue;

            const procurementDetails = eKharidRecord.procurementDetails;
            const warehouseData = eKharidRecord.warehouseData;

            const metaData = {
                name: existingFarmer.name,
                father_name: existingFarmer.father_name,
                address_line: existingFarmer.address_line,
                mobile_no: existingFarmer.mobile_no,
                farmer_code: existingFarmer.farmer_code
            };

            farmerOrdersToInsert.push({
                associateOffers_id: associateOfferRecord._id,
                farmer_id: harvester._id,
                metaData,
                offeredQty: handleDecimal(harvester.qty),
                order_no: harvester.jformID,
                status: _procuredStatus.received,
                gatePassID: procurementDetails.gatePassID || null,
                exitGatePassId: warehouseData.exitGatePassId || null,
                createdAt: harvester.createdAt,
                procurementCenter_id: harvester.procurementId,
                jformID:harvester.jformID,
                ekhrid: true
            });

            farmerOffersToInsert.push({
                associateOffers_id: associateOfferRecord._id,
                farmer_id: harvester._id,
                metaData,
                offeredQty: handleDecimal(harvester.qty),
                createdBy: seller_id,
                jformID:harvester.jformID,
                ekhrid: true
            });

            eKharidUpdates.push({
                updateOne: {
                    filter: { "procurementDetails.jformID": harvester.jformID },
                    update: { $set: { "procurementDetails.offerCreatedAt": new Date() } }
                }
            });
        }

        if (farmerOrdersToInsert.length) await FarmerOrders.insertMany(farmerOrdersToInsert);
        if (farmerOffersToInsert.length) await FarmerOffers.insertMany(farmerOffersToInsert);
        if (eKharidUpdates.length) await eKharidHaryanaProcurementModel.bulkWrite(eKharidUpdates);

        res.status(200).send(new serviceResponse({ status: 200, message: "Offer created successfully" }));
    } catch (error) {
        console.error("❌ Error in createOfferOrder:", error);
        _handleCatchErrors(error, res);
    }
};


module.exports.getEkhridJFormId = async (req, res) => {
    try {
        const query = {
            "procurementDetails.jformID": { $exists: true },
            "warehouseData.jformID": { $exists: false },
            "paymentDetails.jFormId": { $exists: false },
        }
        const procurements = await eKharidHaryanaProcurementModel.find(query).lean();
        if (!procurements.length) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "No valid jform IDs found."
            }));
        }

        const jFormIds = procurements.map(procurement => procurement.procurementDetails.jformID);

        return res.send(new serviceResponse({
            status: 200,
            data: { jFormIds, count: jFormIds.length },
            message: _response_message.found("JForm IDs fetched successfully"),
        }));

    }
    catch (error) {
        console.error("❌ Error in createOfferOrder:", error);
        _handleCatchErrors(error, res);
    }
}

module.exports.getMandiName = async (req, res) => {
    try {
        // Create indexes (optional: can be moved to schema level or startup script)
        await eKharidHaryanaProcurementModel.createIndexes({
            "procurementDetails.commisionAgentName": 1,
            "procurementDetails.farmerID": 1
        });
        await farmer.createIndexes({
            "external_farmer_id": 1
        });
        // Filter query
        const query = {
            'procurementDetails.commisionAgentName': "HAFED",
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            $or: [
                { "procurementDetails.offerCreatedAt": null },
                { "procurementDetails.offerCreatedAt": { $exists: false } }
            ]
        };
        // Fetch procurement data
        const procurements = await eKharidHaryanaProcurementModel
            .find(query)
            .select("procurementDetails")
            .lean();
        // If no results
        if (!procurements.length) {
            return res.send(
                new serviceResponse({
                    status: 200,
                    data: {
                        mandiNames: [],
                        totalCount: 0,
                    },
                    message: _response_message.found("Associate Mandi"),
                })
            );
        }
        // Extract unique mandi names
        const mandiNames = new Set();
        const agentNames = new Set(); // Optional
        for (const p of procurements) {
            if (p?.procurementDetails?.mandiName) {
                mandiNames.add(p.procurementDetails.mandiName);
            }
            if (p?.procurementDetails?.commisionAgentName) {
                agentNames.add(p.procurementDetails.commisionAgentName);
            }
        }
        // Debug log
        console.log("mandiNames:", mandiNames);
        console.log("Total mandiNames:", mandiNames.size);
        // Send response with mandiNames and count
        return res.send(
            new serviceResponse({
                status: 200,
                data: {
                    mandiNames: Array.from(mandiNames),
                    totalCount: mandiNames.size,
                },
                message: _response_message.found("Associate Mandi"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getAllMandiName = async (req, res) => {
    try {
        // Optional: Index creation
        await eKharidHaryanaProcurementModel.createIndexes({
            "procurementDetails.commisionAgentName": 1,
            "procurementDetails.farmerID": 1
        });

        // Query filter
        const query = {
            // "warehouseData.jformID": { $exists: true },
            // "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            // $or: [
            //     { "procurementDetails.offerCreatedAt": null },
            //     { "procurementDetails.offerCreatedAt": { $exists: false } }
            // ]
        };
        // Fetch only necessary fields
        const procurements = await eKharidHaryanaProcurementModel
            .find(query)
            .select("procurementDetails.commisionAgentName procurementDetails.mandiName")
            .lean();
        if (!procurements.length) {
            return res.send(
                new serviceResponse({
                    status: 200,
                    data: {},
                    message: _response_message.notFound("Associate Mandi"),
                })
            );
        }
        // Group mandi names under each commission agent
        const result = {};
        for (const p of procurements) {
            const agentName = p?.procurementDetails?.commisionAgentName;
            const mandiName = p?.procurementDetails?.mandiName;
            if (!agentName || !mandiName) continue;
            if (!result[agentName]) {
                result[agentName] = new Set();
            }
            result[agentName].add(mandiName);
        }
        // Convert Sets to arrays
        const responseData = {};
        for (const [agent, mandis] of Object.entries(result)) {
            responseData[agent] = Array.from(mandis);
        }
        // Send response
        return res.send(
            new serviceResponse({
                status: 200,
                data: responseData,
                message: _response_message.found("Associate Mandi"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.totalQty = async (req, res) => {
    try {
        const allJformIds = jformIds.map(id => parseInt(id));

        const matchStage = {
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            // "procurementDetails.jformID": { $in: allJformIds },
            "procurementDetails.offerCreatedAt": { $ne: null }
            // $or: [
            //     { "procurementDetails.offerCreatedAt": null },
            //     { "procurementDetails.offerCreatedAt": { $exists: true } }
            // ]
        };
        const result = await eKharidHaryanaProcurementModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalGatePassWeightQtl: { $sum: "$procurementDetails.JformFinalWeightQtl" }
                }
            },
        ]);
        const totalQtl = result[0]?.totalGatePassWeightQtl || 0;
        const totalMT = totalQtl / 10;

        const totalAmount = totalMT * 59500;
        res.json({
            totalGatePassWeightQtl: totalQtl,
            totalGatePassWeightMT: totalMT,
            totalAmount: totalAmount
        });
    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};

module.exports.allPaymentOrders = async (req, res) => {
    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const query = {
            "ekhridBatch": { $exists: true },
            bo_approve_status: _paymentApproval.approved,
            ho_approve_status: _paymentApproval.approved,
        };

        const records = { count: 0 };

        records.rows = await Batch.find(query)
            .select("batchId procurementCenter_id seller_id req_id farmerOrderIds warehousedetails_id qty totalPrice gatePassId")
            .populate({ path: "procurementCenter_id", select: "center_name" })
            .populate({ path: "seller_id", select: "basic_details.associate_details.organization_name" })
            .populate({ path: "req_id", select: "reqNo" })
            .populate({ path: "farmerOrderIds.farmerOrder_id", select: "farmer_id metaData order_no" })
            .populate({ path: "warehousedetails_id", select: "warehouseDetailsId basicDetails.warehouseName" })
            // .limit(10)
            .lean();

        records.count = await Batch.countDocuments(query);

        if (isExport == 1) {

            const record = records.rows.map((item) => {

                const farmerOrders = item?.farmerOrderIds?.map(f => ({
                    id: f?.farmerOrder_id?.order_no || 'NA',
                    name: f?.farmerOrder_id?.metaData?.name || 'NA'
                })) || [];

                const farmerIds = farmerOrders.map(f => f.id).join(", ");
                const farmerNames = farmerOrders.map(f => f.name).join(", ");

                return {
                    "Order Id": item?.req_id?.reqNo || "NA",
                    "Batch Id": item?.batchId || "NA",
                    "Quantity": item?.qty || "NA",
                    "totalPrice": item?.totalPrice || "NA",
                    "Quantity": item?.qty || "NA",
                    "gatePassId": item?.gatePassId || "NA",
                    "Mandi Name": item?.procurementCenter_id?.center_name || "NA",
                    "Associate Name": item?.seller_id?.basic_details?.associate_details?.organization_name || "NA",
                    "Farmer Id": farmerIds || "NA",
                    "Farmer Name": farmerNames || "NA",
                    "Warehouse ID": item?.warehousedetails_id?.warehouseDetailsId || "NA",
                    "Warehouse Name": item?.warehousedetails_id?.basicDetails?.warehouseName || "NA"
                }
            })

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Ekhrid Orders.xlsx`,
                    worksheetName: `Ekhrid Orders`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Ekhrid Orders") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Ekhrid Orders") }))
        }

    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};

module.exports.getBatchIds = async (req, res) => {
    try {

        const query = {
            "ekhridBatch": { $exists: true },
            batchIdUpdated: null,
            bo_approve_status: _paymentApproval.approved,
            ho_approve_status: _paymentApproval.approved,
        };

        const records = { count: 0 };
        records.count = await Batch.countDocuments(query);
        records.rows = await Batch.find(query).select({ batchId: 1, _id: 0 }).limit(300).lean();

        return res.send(
            new serviceResponse({
                status: 200,
                data: records,
                message: _response_message.found("BatchID"),
            })
        );

    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};

module.exports.updateBatchIds = async (req, res) => {
    try {

        const ekhridQuery = {
            // 'procurementDetails.commisionAgentName': associateName,
            "warehouseData.jformID": { $exists: true },
            'warehouseData.exitGatePassId': { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            "procurementDetails.offerCreatedAt": { $exists: true },
            $or: [
                { "procurementDetails.batchIdUpdatedAt": null },
                { "procurementDetails.batchIdUpdatedAt": { $exists: false } }
            ]
        };

        const ekharidRecords = await eKharidHaryanaProcurementModel.find(ekhridQuery).limit(1);
        console.log(ekharidRecords);

        // return false;

        let updatedCount = 0;
        let notFoundList = [];

        for (const record of ekharidRecords) {
            // const jformID = record.procurementDetails?.jformID;
            const gatePassID = record.procurementDetails?.gatePassID;
            const exitGatePassId = record.warehouseData?.exitGatePassId;
            console.log("exitGatePassId", exitGatePassId);
            console.log("gatePassID", gatePassID);

            if (!gatePassID || !exitGatePassId) {
                notFoundList.push(gatePassID || 'Unknown');
                continue;
            }

            const updated = await Batch.findOneAndUpdate(
                { batchId: gatePassID.toString() },  // match old ID
                {
                    $set: {
                        batchId: exitGatePassId.toString(),
                        batchIdUpdated: true
                    }
                }
            );

            if (updated) {
                // Update procurementDetails.batchIdUpdatedAt
                record.procurementDetails.batchIdUpdatedAt = new Date();
                await record.save();

                updatedCount++;
            } else {
                notFoundList.push(gatePassID);
            }

        }

        return res.status(200).json({
            message: `${updatedCount} batch records updated.`,
            notMatchedJformIds: notFoundList,
        });

    } catch (error) {
        console.error('Error in updateBatchIdsFromEKharid:', error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

module.exports.totalQtyFarmerOrder = async (req, res) => {
    try {
        const matchStage = {
            associateOffers_id: new mongoose.Types.ObjectId("681c8458dba86b2c72db1709"),
            // "batchCreatedAt": { $exists: true }
        };

        const result = await FarmerOrders.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    offeredQty: { $sum: "$offeredQty" }
                }
            },
        ]);
        const totalQtl = result[0]?.offeredQty || 0;

        res.json({
            offeredQty: totalQtl,

        });
    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};

module.exports.ekhridFarmerOrderMapping = async (req, res) => {
    try {
        // Step 1: Fetch gatePassIDs from eKharidHaryana
        const gatePassIDsEKharidHaryanaDocs = await eKharidHaryanaProcurementModel.find({
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            "procurementDetails.offerCreatedAt": { $ne: null },
            // "procurementDetails.commisionAgentName": "SWARAJ FEDERATION OF MULTIPURPOSE COOP SOCIETY LTD"
            "procurementDetails.commisionAgentName": "HAFED"
        });

        const ekharidGatePassIDs = gatePassIDsEKharidHaryanaDocs
            .map(doc => doc?.procurementDetails?.gatePassID)
            .filter(id => typeof id === 'number');

        console.log("Fetched eKharid gatePassIDs count:", ekharidGatePassIDs.length);

        // Step 2: Fetch all gatePassIDs used in FarmerOrders
        const farmerOrderGatePassIDs = await FarmerOrders.distinct("gatePassID", {
            gatePassID: { $ne: null },
            // associateOffers_id: new mongoose.Types.ObjectId("681c8458dba86b2c72db1709"),
            associateOffers_id: new mongoose.Types.ObjectId("681c91dc2e8cd7e6c0d71a8e"),
        });
        console.log("Fetched FarmerOrders gatePassIDs count:", farmerOrderGatePassIDs.length);
        // Step 3: Find eKharid gatePassIDs NOT present in FarmerOrders
        const unmatchedGatePassIDs = ekharidGatePassIDs.filter(id => !farmerOrderGatePassIDs.includes(id));

        console.log("GatePassIDs to nullify offerCreatedAt for:", unmatchedGatePassIDs.length);

        if (unmatchedGatePassIDs.length === 0) {
            return res.json({
                message: "No unmatched gatePassIDs found. No update needed.",
                updatedCount: 0
            });
        }

        // Step 4: Update eKharidHaryanaProcurementModel documents
        const updateResult = await eKharidHaryanaProcurementModel.updateMany(
            {
                "procurementDetails.gatePassID": { $in: unmatchedGatePassIDs },
                // "procurementDetails.commisionAgentName": "SWARAJ FEDERATION OF MULTIPURPOSE COOP SOCIETY LTD"
                "procurementDetails.commisionAgentName": "HAFED"
            },
            {
                $set: { "procurementDetails.offerCreatedAt": null }
            }
        );

        res.json({
            message: "Cleanup complete",
            unmatchedGatePassIDs: unmatchedGatePassIDs.length,
            updatedCount: updateResult.modifiedCount
        });

    } catch (error) {
        console.error("Error in ekhridFarmerOrderMapping:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports.getNewJformIds = async (req, res) => {
    const fs = require('fs');

    try {
        // Assuming jformIds is defined globally or retrieved from req
        const allJformIds = jformIds.map(id => parseInt(id));

        // Step 1: Query only existing jformIDs in one go
        const existingDocs = await eKharidHaryanaProcurementModel.find(
            {
                "procurementDetails.jformID": { $in: allJformIds },
                // "warehouseData.jformID": { $exists: true },
                "paymentDetails.jFormId": { $exists: false }
            },
            { "procurementDetails.jformID": 1 }
        ).lean();

        console.log("Existing jformIDs count:", existingDocs.length);
        // Step 2: Extract found IDs
        const existingIdsSet = new Set(
            existingDocs.map(doc => doc.procurementDetails.jformID)
        );

        //  Filter IDs that are existing in the set
        const newJformIds = allJformIds.filter(id => existingIdsSet.has(id));
        // //  Write result to file
        fs.writeFileSync('./paymentDetailsMissing.txt', JSON.stringify(newJformIds, null, 2));

        //  Filter IDs that are not in the existing set
        // const newJformIds = allJformIds.filter(id => !existingIdsSet.has(id));
        // console.log("newJformIds count:", newJformIds.length);
        //  Write result to file
        fs.writeFileSync('./newJFormIds.txt', JSON.stringify(newJformIds, null, 2));

        return res.json({ message: "OK", newCount: newJformIds.length });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports.totalQtyRania = async (req, res) => {
    try {
        const matchStage = {
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            "procurementDetails.offerCreatedAt": { $ne: null },
            "procurementDetails.mandiName": "Rania"
        };

        const result = await eKharidHaryanaProcurementModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$warehouseData.exitGatePassId",
                    totalQtyQtl: { $sum: "$procurementDetails.JformFinalWeightQtl" }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalQtyQtl: 1,
                    totalQtyMT: { $multiply: ["$totalQtyQtl", 0.1] }
                }
            },
            {
                $sort: { totalQtyMT: -1 } // Optional sorting
            }
        ]);

        res.json({
            groupedQty: result
        });
    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};

module.exports.totalQtyBarwala = async (req, res) => {
    try {
        const matchStage = {
            "warehouseData.jformID": { $exists: true },
            "paymentDetails.jFormId": { $exists: true },
            "procurementDetails.jformID": { $exists: true },
            "procurementDetails.offerCreatedAt": { $ne: null },
            "procurementDetails.mandiName": { $in: ["Barwala(H)", "Barwala(H)"] },
            "procurementDetails.commisionAgentName": "HAFED"
        };

        const groupedResult = await eKharidHaryanaProcurementModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$warehouseData.exitGatePassId",
                    totalQtyQtl: { $sum: "$procurementDetails.JformFinalWeightQtl" }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalQtyQtl: 1,
                    totalQtyMT: { $multiply: ["$totalQtyQtl", 0.1] }
                }
            },
            {
                $sort: { totalQtyMT: -1 } // Optional sorting
            }
        ]);

        // Calculate grand total from the grouped result
        const grandTotal = groupedResult.reduce(
            (acc, item) => {
                acc.totalQtyQtl += item.totalQtyQtl;
                acc.totalQtyMT += item.totalQtyMT;
                return acc;
            },
            { totalQtyQtl: 0, totalQtyMT: 0 }
        );

        res.json({
            groupedQty: groupedResult,
            totalQtyQtl: grandTotal.totalQtyQtl,
            totalQtyMT: grandTotal.totalQtyMT
        });

        // res.json({
        //     groupedQty: result
        // });
    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};

module.exports.getBatchIdandDeletePayment = async (req, res) => {
    try {
        const matchStage = {
            associateOffer_id: new mongoose.Types.ObjectId("681c91dc2e8cd7e6c0d71a8e"),
            procurementCenter_id: {
                $in: [
                    new mongoose.Types.ObjectId("67e3c0d316a8db907254c7b1"),
                    new mongoose.Types.ObjectId("67ee35f407654b69eabda474")
                ]
            }
        };

        // Step 1: Fetch batch IDs
        const batches = await Batch.find(matchStage, { _id: 1 });
        const batchIds = batches.map(batch => batch._id);
        const count = batchIds.length;

        if (count === 0) {
            return res.json({
                message: "No batches found for given criteria.",
                batchIds: [],
                deletedCount: 0
            });
        }

        // Step 2: Delete payments with batch_id in batchIds
        const paymentResult = await Payment.find({ batch_id: { $in: batchIds } });
        // const deleteResult = await Payment.deleteMany({ batch_id: { $in: batchIds } });

        res.json({
            message: "Payments deleted successfully",
            batchIds,
            batchCount: count,
            paymentCount: paymentResult.length,
            //   deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error("Error in totalQty:", error);
        _handleCatchErrors(error, res);
    }
};


// Helper to get start and end of today in ISO
function getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

module.exports.getTodaysfarmerOrder = async (req, res) => {
    try {
        const { start, end } = getTodayRange();
        const filter = {
            createdAt: { $gte: start, $lte: end },
            associateOffers_id: new mongoose.Types.ObjectId("681c8458dba86b2c72db1709"),
            ekhrid: true,
            batchCreatedAt: { $exists: false }
        };

        const [orders, totalCount, totalOfferedQtyAgg] = await Promise.all([
            FarmerOrders.find(filter).select('_id').sort({ createdAt: -1 }),
            FarmerOrders.countDocuments(filter),
            FarmerOrders.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalOfferedQty: { $sum: '$offeredQty' }
                    }
                }
            ])
        ]);

        const ids = orders.map(order => order._id);
        const totalOfferedQty = totalOfferedQtyAgg[0]?.totalOfferedQty || 0;

        // Delete the fetched records
        await FarmerOrders.deleteMany({ _id: { $in: ids } });

        res.status(200).json({
            success: true,
            message: 'Fetched and deleted today\'s orders.',
            totalDeleted: totalCount,
            totalOfferedQty,
            // ids: orders.map(order => order._id)
            deletedIds: ids
        });
    } catch (error) {
        console.error('Error in fetching/deleting today\'s farmer orders:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing today\'s orders'
        });
    }
};

// 
module.exports.checkJformIdsExist = async (req, res) => {
    const fs = require('fs');
    const XLSX = require('xlsx');
    try {
        // Assuming jformIds is defined globally or retrieved from req
        // const allJformIds = checkJformIdsExist.map(id => parseInt(id));
        const allJformIds = jformIds.map(id => parseInt(id));

        // Step 1: Query only existing jformIDs in one go
        const existingDocs = await eKharidHaryanaProcurementModel.find(
            {
                "procurementDetails.jformID": { $in: allJformIds },
                // "procurementDetails.jformID": { $exists: true },
                // "warehouseData.jformID": { $exists: true },
                "paymentDetails.jFormId": { $exists: true }
            },
            { "procurementDetails.jformID": 1 }
        ).lean();

        console.log("Existing jformIDs count:", existingDocs.length);
        console.log("allJformIds count:", allJformIds.length);
        // Step 2: Extract found IDs
        const existingIdsSet = new Set(
            existingDocs.map(doc => doc.procurementDetails.jformID)
        );


        const newJformIds = allJformIds.filter(id => !existingIdsSet.has(id));
        console.log("newJformIds count:", newJformIds.length);
        // //  Write result to file
        // fs.writeFileSync('./paymentDetailsExisting.txt', JSON.stringify(newJformIds, null, 2));

        // Create Excel data (convert to array of objects)
        // const excelData = newJformIds.map(id => ({ jformID: id }));
        // // Create a workbook and worksheet
        // const wb = XLSX.utils.book_new();
        // const ws = XLSX.utils.json_to_sheet(excelData);

        // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        // // Write the workbook to a file
        // XLSX.writeFile(wb, './warehouseMissing.xlsx');


        //  Filter IDs that are existing in the set
        // const newJformIds = allJformIds.filter(id => existingIdsSet.has(id));
        // console.log("newJformIds count:", newJformIds.length);
        // //  Write result to file
        // fs.writeFileSync('./paymentDetailsMissing.txt', JSON.stringify(newJformIds, null, 2));
        // fs.writeFileSync('./iFormDetailMissing.txt', JSON.stringify(newJformIds, null, 2));
        //  Filter IDs that are not in the existing set
        // const newJformIds = allJformIds.filter(id => !existingIdsSet.has(id));
        // console.log("newJformIds count:", newJformIds.length);
        //  Write result to file
        // fs.writeFileSync('./checkJformIdsExist.txt', JSON.stringify(newJformIds, null, 2));

        return res.json({ message: "OK", newCount: newJformIds.length });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports.ekhridProcrementExport = async (req, res) => {
    const fs = require('fs');
    // const { page = 1, limit = 10, sortBy, isExport = 0 } = req.query;

    const { start = 0, end = 30000, sortBy = "procurementDetails.jformDate", sortOrder = "desc", isExport = 0 } = req.query;

    const startIndex = parseInt(start);
    const endIndex = parseInt(end);
    const limit = endIndex - startIndex;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    try {
        // Assuming jformIds is defined globally or retrieved from req
        const allJformIds = checkJformIdsExist.map(id => parseInt(id));


        // Step 1: Query only existing jformIDs in one go
        const records = await eKharidHaryanaProcurementModel.find(
            {
                "procurementDetails.jformID": { $in: allJformIds },
                // "procurementDetails.commisionAgentName": "FARMERS CONSORTIUM FOR AGRICULTURE &ALLIED SEC HRY",
                // "procurementDetails.commisionAgentName": "SWARAJ FEDERATION OF MULTIPURPOSE COOP SOCIETY LTD",
                // "procurementDetails.commisionAgentName": "HAFED",
            }
        )
            .sort({ createdAt: -1, _id: -1 })
            // .skip(startIndex)
            // .limit(limit)
            .lean();


        console.log("Existing jformIDs count:", records.length);
        console.log("allJformIds count:", allJformIds.length);

        if (isExport == 1) {
            const record = records.map((item) => {

                return {
                    "session": item?.session || "NA",
                    "Agency Name": item?.procurementDetails.agencyName || "NA",
                    "commodityName": item?.procurementDetails.commodityName || "NA",
                    "mandiName": item?.procurementDetails.mandiName || "NA",
                    "gatePassWeightQtl": item?.procurementDetails.gatePassWeightQtl || "NA",
                    "farmerID": item?.procurementDetails.farmerID || "NA",
                    "gatePassID": item?.procurementDetails.gatePassID || "NA",
                    "gatePassDate": item?.procurementDetails.gatePassDate || "NA",
                    "auctionID": item?.procurementDetails.auctionID || "NA",
                    "auctionDate": item?.procurementDetails.auctionDate || "NA",
                    "commisionAgentName": item?.procurementDetails.commisionAgentName || "NA",
                    "jformID": item?.procurementDetails.jformID || "NA",
                    "jformDate": item?.procurementDetails.jformDate || "NA",
                    "JformFinalWeightQtl": item?.procurementDetails.JformFinalWeightQtl || "NA",
                    "totalBags": item?.procurementDetails.totalBags || "NA",
                    "liftedDate": item?.procurementDetails.liftedDate || "NA",
                    "destinationWarehouseName": item?.procurementDetails.destinationWarehouseName || "NA",
                    "receivedAtDestinationDate": item?.procurementDetails.receivedAtDestinationDate || "NA",
                    "jformApprovalDate": item?.procurementDetails.jformApprovalDate || "NA",
                    "mspRateMT": item?.procurementDetails.mspRateMT || "NA",
                    "paymentDetails.jFormId": item?.paymentDetails.jFormId || "NA",
                    "paymentDetails.reason": item?.paymentDetails.reason || "NA",
                    "paymentDetails.transactionAmount": item?.paymentDetails.transactionAmount || "NA",
                    "paymentDetails.transactionDate": item?.paymentDetails.transactionDate || "NA",
                    "paymentDetails.transactionId": item?.paymentDetails.transactionId || "NA",
                    "paymentDetails.transactionStatus": item?.paymentDetails.transactionStatus || "NA",
                    "warehouseData.destinationAddress": item?.warehouseData.destinationAddress || "NA",
                    "warehouseData.driverName": item?.warehouseData.driverName || "NA",
                    "warehouseData.exitGatePassId": item?.warehouseData.exitGatePassId || "NA",
                    "warehouseData.inwardDate": item?.warehouseData.inwardDate || "NA",
                    "warehouseData.jformID": item?.warehouseData.jformID || "NA",
                    "warehouseData.transporterName": item?.warehouseData.transporterName || "NA",
                    "warehouseData.truckNo": item?.warehouseData.truckNo || "NA",
                    "warehouseData.warehouseId": item?.warehouseData.warehouseId || "NA",
                    "warehouseData.warehouseName": item?.warehouseData.warehouseName || "NA",
                }
            })

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `EkhridProcurement.xlsx`,
                    worksheetName: `EkhridProcurement`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate") }))
            }
        }
        else {

            return res.status(200).send(new serviceResponse({
                status: 200,
                data: {
                    rows: records
                },
                message: _response_message.found("associates")
            }));
        }

        // return res.json({ message: "OK", data: records });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports.associateMandiName = async (req, res) => {

    try {
        const { associate_id, mandiName, commisionAgentName } = req.body;

        if (!mandiName || !commisionAgentName) {
            return res.status(400).json({
                success: false,
                message: "mandiName, and commisionAgentName are required.",
            });
        }

        const newEntry = new AssociateMandiName({
            associate_id,
            mandiName,
            commisionAgentName,
        });

        const savedEntry = await newEntry.save();

        return res.status(201).json({
            success: true,
            message: "Associate Mandi Name added successfully.",
            data: savedEntry,
        });
    }
    catch (err) {
        console.error("Error in addAssociateMandiName:", error);
        return res.status(500).json({ error: err.message });
    }

};

module.exports.updateAssociateMandiId = async (req, res) => {

    try {
        const allDocs = await AssociateMandiName.find({});

        if (!allDocs.length) {
            return res.status(404).json({
                success: false,
                message: "No AssociateMandiName documents found.",
            });
        }

        // Loop through each document and update related records

        const results = await Promise.allSettled(
            allDocs.map(async (doc) => {
                const { _id, mandiName } = doc;

                if (!mandiName) return;

                const center = await ProcurementCenter.findOne({ center_name: mandiName });

                if (center) {
                    await AssociateMandiName.findByIdAndUpdate(
                        _id,
                        { procurementCenter_id: center._id }
                    );
                }
            })
        );

        /*
                const results = await Promise.allSettled(
                    allDocs.map(async (doc) => {
                        const { _id, commisionAgentName } = doc;
        
                        if (!commisionAgentName) return;
        
                        const associate = await User.findOne({ 'basic_details.associate_details.organization_name': commisionAgentName });
        
                        if (associate) {
                            await AssociateMandiName.findByIdAndUpdate(
                                _id,
                                { associate_id: associate._id }
                            );
                        }
                    })
                );
        */
        const successCount = results.filter(r => r.status === "fulfilled").length;
        const failCount = results.length - successCount;

        return res.status(200).json({
            success: true,
            message: "Bulk update completed.",
            updated: successCount,
            failed: failCount,
        });

    } catch (error) {
        console.error("Error in bulk update:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }

};

module.exports.sunflowerMandiName = async (req, res) => {
    try {

        const matchStage = {
            "procurementDetails.commodityName": "Sunflower",
        };

        // Get unique mandi names
        const mandiResults = await eKharidHaryanaProcurementModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$procurementDetails.mandiName"
                }
            },
            {
                $project: {
                    _id: 0,
                    mandiName: "$_id"
                }
            }
        ]);

        // Get unique commission agent names
        const agentResults = await eKharidHaryanaProcurementModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$procurementDetails.commisionAgentName"
                }
            },
            {
                $project: {
                    _id: 0,
                    commisionAgentName: "$_id"
                }
            }
        ]);

        // Extract values into arrays
        const mandiNames = mandiResults.map(item => item.mandiName);
        const commisionAgentNames = agentResults.map(item => item.commisionAgentName);

        return res.status(200).json({
            success: true,
            message: "Unique Sunflower mandi and agent names fetched successfully.",
            data: {
                mandiNames,
                mandiNameCount: mandiNames.length,
                commisionAgentNames,
                commisionAgentNameCount: commisionAgentNames.length
            }
        });
    }
    catch (err) {
        console.error("Error in SunflowerMandiName:", err);
        return res.status(500).json({ error: err.message });
    }
}

module.exports.sunflowerMandiWiseDataExport = async (req, res) => {
    try {
        const { Parser } = require('json2csv');
        const matchStage = {
            "procurementDetails.commodityName": "Sunflower",
            "procurementDetails.mandiName": {
                $in: ["Shahbad", "Ishmilabad", "Ismailabad", "Thol", "Jhansa", "Mullana", "Naraingarh", "Sadhaura"]
            }
        };

        const data = await eKharidHaryanaProcurementModel.aggregate([
            {
                $match: {
                    "procurementDetails.commodityName": "Sunflower",
                    "procurementDetails.mandiName": {
                        $in: ["Shahbad", "Ishmilabad", "Ismailabad", "Thol", "Jhansa", "Mullana", "Naraingarh", "Sadhaura"]
                    }
                }
            },
            {
                $addFields: {
                    farmerIDAsNumber: { $toLong: "$procurementDetails.farmerID" }
                }
            },
            {
                $lookup: {
                    from: 'farmers',
                    let: { farmerId: "$farmerIDAsNumber" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$external_farmer_id", "$$farmerId"]
                                }
                            }
                        },
                        { $project: { name: 1 } }
                    ],
                    as: "farmerInfo"
                }
            },
            {
                $unwind: {
                    path: "$farmerInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    farmerName: "$farmerInfo.name",
                    jformID: "$procurementDetails.jformID",
                    jformFinalWeightQtl: "$procurementDetails.JformFinalWeightQtl",
                    mandiName: "$procurementDetails.mandiName",
                    procurementDate: "$procurementDetails.jformApprovalDate"
                }
            }
        ]);

        if (!data.length) {
            return res.status(404).json({ success: false, message: "No data found" });
        }
        // console.log("Data fetched for CSV export:", data);
        // Convert JSON to CSV
        const fields = ['farmerName', 'jformID', 'jformFinalWeightQtl', 'mandiName', 'procurementDate'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        // Set headers and send CSV
        res.header('Content-Type', 'text/csv');
        res.attachment('sunflower_procurement.csv');
        return res.send(csv);

    } catch (error) {
        console.error("CSV export error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports.checkFinalJformIdsExist = async (req, res) => {
    const fs = require('fs');
    const XLSX = require('xlsx');
    try {
        // Make sure jformIds is defined or fetched from request
        const allJformIds = checkJformIdsExist.map(id => parseInt(id));

        // Query DB for documents that match
        const existingDocs = await eKharidHaryanaProcurementModel.find(
            {
                "procurementDetails.jformID": { $in: allJformIds },
                "procurementDetails.iFormId": { $exists: true },
                "paymentDetails.jFormId": { $exists: true },
                "warehouseData.jformID": { $exists: true }
            },
            {
                "procurementDetails.jformID": 1,
                "procurementDetails.JformFinalWeightQtl": 1 // <-- Add qty field
            }
        ).lean();

        console.log("Existing jformIDs count:", existingDocs.length);
        console.log("allJformIds count:", allJformIds.length);

        // Extract jformIDs found in DB
        const existingIdsSet = new Set(
            existingDocs.map(doc => doc.procurementDetails.jformID)
        );

        // Calculate total quantity (sum of jformFinalWeightQtl)

        const totalQty = existingDocs.reduce((sum, doc) => {
            const qty = doc?.procurementDetails?.JformFinalWeightQtl;
            if (typeof qty === 'number') {
                return sum + qty;
            } else {
                console.warn(`No qty found for jformID: ${doc?.procurementDetails?.jformID}`);
                return sum;
            }
        }, 0);

        // Get missing jformIDs
        const newJformIds = allJformIds.filter(id => !existingIdsSet.has(id));
        console.log("Missing JformIds count:", newJformIds.length);

        // Prepare Excel data of missing jformIDs
        const excelData = newJformIds.map(id => ({ jformID: id }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, './paymentDetailsMissing(2025-07-15).xlsx');

        // Return response
        return res.json({
            message: "Success",
            total: allJformIds.length,
            foundInDB: existingIdsSet.size,
            missing: newJformIds.length,
            totalQty: +totalQty.toFixed(2) // Round to 2 decimals
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports.ekhridExport = async (req, res) => {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');
    try {
        const allJformIds = checkJformIdsExist.map(id => parseInt(id));

        const existingDocs = await eKharidHaryanaProcurementModel.find(
            {
                "procurementDetails.jformID": { $in: allJformIds },
                // "procurementDetails.iFormId": { $exists: true },
                "procurementDetails.offerCreatedAt": { $exists: true },
                "procurementDetails.commodityName": "Mustard"
            }
        ).sort({ createdAt: -1, _id: -1 }).lean();

        // console.log("Existing jformIDs count:", existingDocs.length);
        // console.log("allJformIds count:", allJformIds.length);

        const matchedIdsSet = new Set(existingDocs.map(doc => doc?.procurementDetails?.jformID));
        const newJformIds = allJformIds.filter(id => !matchedIdsSet.has(id));

        const farmerIds = existingDocs
            .map(doc => doc?.procurementDetails?.farmerID)
            .filter(Boolean);

        const farmers = await farmer.find({
            external_farmer_id: { $in: farmerIds }
        }).lean();

        // console.log('Farmers fetched:', farmers.length);

        const farmerMap = new Map();
        farmers.forEach(f => {
            farmerMap.set(String(f.external_farmer_id), f);
        });

        const matchedExcelData = existingDocs.map(doc => {
            const farmerID = doc?.procurementDetails?.farmerID;
            const farmer = farmerMap.get(String(farmerID)) || {};

            // console.log('Farmers fetched:', farmers.length);
            // console.log('Sample farmer:', farmers[0]);

            return {
                jformID: doc?.procurementDetails?.jformID || '',
                agencyName: doc?.procurementDetails?.agencyName || '',
                commodityName: doc?.procurementDetails?.commodityName || '',
                mandiName: doc?.procurementDetails?.mandiName || '',
                gatePassWeightQtl: doc?.procurementDetails?.gatePassWeightQtl || '',
                farmerID: farmerID || '',
                farmerName: farmer.name || farmer.basic_details?.name,                 // <-- new field
                farmerMobile: farmer.mobile_no || farmer.basic_details?.mobile_no,             // <-- new field
                gatePassID: doc?.procurementDetails?.gatePassID || '',
                gatePassDate: doc?.procurementDetails?.gatePassDate || '',
                auctionID: doc?.procurementDetails?.auctionID || '',
                auctionDate: doc?.procurementDetails?.auctionDate || '',
                commisionAgentName: doc?.procurementDetails?.commisionAgentName || '',
                jformDate: doc?.procurementDetails?.jformDate || '',
                JformFinalWeightQtl: doc?.procurementDetails?.JformFinalWeightQtl || '',
                totalBags: doc?.procurementDetails?.totalBags || '',
                liftedDate: doc?.procurementDetails?.liftedDate || '',
                destinationWarehouseName: doc?.procurementDetails?.destinationWarehouseName || '',
                receivedAtDestinationDate: doc?.procurementDetails?.receivedAtDestinationDate || '',
                jformApprovalDate: doc?.procurementDetails?.jformApprovalDate || '',
                offerCreatedAt: doc?.procurementDetails?.offerCreatedAt || '',
                batchCreatedAt: doc?.procurementDetails?.batchCreatedAt || '',
                centerCreatedAt: doc?.procurementDetails?.centerCreatedAt || '',
                warehouseCreatedAt: doc?.procurementDetails?.warehouseCreatedAt || '',
                batchIdUpdatedAt: doc?.procurementDetails?.batchIdUpdatedAt || '',

                // Payment Details
                payment_jFormId: doc?.paymentDetails?.jFormId || '',
                transactionId: doc?.paymentDetails?.transactionId || '',
                transactionAmount: doc?.paymentDetails?.transactionAmount || '',
                transactionDate: doc?.paymentDetails?.transactionDate || '',
                transactionStatus: doc?.paymentDetails?.transactionStatus || '',
                paymentReason: doc?.paymentDetails?.reason || '',

                // Warehouse Data
                destinationAddress: doc?.warehouseData?.destinationAddress || '',
                driverName: doc?.warehouseData?.driverName || '',
                exitGatePassId: doc?.warehouseData?.exitGatePassId || '',
                warehouse_jFormId: doc?.warehouseData?.jFormId || '',
                transporterName: doc?.warehouseData?.transporterName || '',
                truckNo: doc?.warehouseData?.truckNo || '',
                warehouseId: doc?.warehouseData?.warehouseId || '',
                warehouseName: doc?.warehouseData?.warehouseName || ''
            };
        });
        const wb = XLSX.utils.book_new();
        const matchedSheet = XLSX.utils.json_to_sheet(matchedExcelData);
        XLSX.utils.book_append_sheet(wb, matchedSheet, 'MatchedRecords');

        const missingSheet = XLSX.utils.json_to_sheet(newJformIds.map(id => ({ jformID: id })));
        XLSX.utils.book_append_sheet(wb, missingSheet, 'MissingJformIDs');

        const filePath = path.join(__dirname, '../exports/eKharidMappedWithFarmerDetailsReport.xlsx'); // adjust folder
        XLSX.writeFile(wb, filePath);

        return res.download(filePath, 'eKharidMappedWithFarmerDetailsReport.xlsx');

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports.updateAssociateName = async (req, res) => {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');
    try {
        // const allJformIds = checkJformIdsExist.map(id => parseInt(id));
        const needToUpdateParsed = needToUpdateAssociateJformIds.map(id => parseInt(id));

        const existingDocs = await eKharidHaryanaProcurementModel.find({

            "procurementDetails.jformID": { $in: needToUpdateParsed },
            // "warehouseData.jformID": { $exists: true },
            // "paymentDetails.jFormId": { $exists: true },
        });

        const updateResult = await eKharidHaryanaProcurementModel.updateMany(
            {
                "procurementDetails.jformID": { $in: needToUpdateParsed },
                "procurementDetails.offerCreatedAt": null,
            },
            {
                $set: { "procurementDetails.commisionAgentName": "HAFED" }
            }
        );

        res.json({
            message: "Associate Updated",
            existingDocs: existingDocs.length,
            updatedCount: updateResult.modifiedCount
        });

    } catch (error) {
        console.error("Error in updateAssociate:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.notIncludedJformId = async (req, res) => {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');
    try {
        // const allJformIds = checkJformIdsExist.map(id => parseInt(id));
        const needToUpdateParsed = jformIdDeleted.map(id => parseInt(id));

        const existingDocs = await eKharidHaryanaProcurementModel.find({

            "procurementDetails.jformID": { $in: needToUpdateParsed },
            // "warehouseData.jformID": { $exists: true },
            // "paymentDetails.jFormId": { $exists: true },
        });

        const updateResult = await eKharidHaryanaProcurementModel.updateMany(
            {
                "procurementDetails.jformID": { $in: needToUpdateParsed },
                // "procurementDetails.offerCreatedAt": null,
            },
            {
                $set: { "procurementDetails.notIncludedJformId": true }
            }
        );

        res.json({
            message: "Associate Updated",
            existingDocs: existingDocs.length,
            updatedCount: updateResult.modifiedCount
        });

    } catch (error) {
        console.error("Error in updateAssociate:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}