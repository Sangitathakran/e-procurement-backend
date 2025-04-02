const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { _userType, _userStatus, _requestStatus, _webSocketEvents, _procuredStatus, _associateOfferStatus, _collectionName } = require("@src/v1/utils/constants");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel, _generateOrderNumber, _addDays, handleDecimal } = require("@src/v1/utils/helpers");
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
            { $match: { _id: { $ne: null }, farmerId: { $ne: null },
             "procurementDetails.offerCreatedAt": null 
            } }
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
       let  userBulkUpdated = {}
        if (userBulkOps.length > 0) {
            userBulkUpdated= await User.bulkWrite(userBulkOps);
        }
    let farmerBulkUpdated = {}
        if (farmerBulkOps.length > 0) {
            farmerBulkUpdated= await farmer.bulkWrite(farmerBulkOps);
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

module.exports.addFarmers = async (req, res) => {
    try {
        // Fetch unique farmer IDs and jForm IDs from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            {
                $match: {
                    "procurementDetails.farmerID": { $ne: null }, // Ensure farmerID is not null
                    "procurementDetails.offerCreatedAt": null
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
            farmerBulkUpdated= await farmer.bulkWrite(farmerBulkOps);
        }

        return res.send(new serviceResponse({
            status: 200,
            data:farmerBulkUpdated,
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
                    "procurementDetails.mandiName": { $ne: null },
                    "procurementDetails.centerCreatedAt": null
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

module.exports.associateFarmerList = async (req, res) => {
    const { associateName } = req.body;
    try {

        let query = {
            'procurementDetails.commisionAgentName': associateName,
            $or: [
                { "procurementDetails.offerCreatedAt": { $eq: null } }, // "procurementDetails.offerCreatedAt" is null
                { "procurementDetails.offerCreatedAt": { $exists: false } } // "procurementDetails.offerCreatedAt" does not exist
            ]
        };

        const groupedData = await eKharidHaryanaProcurementModel.aggregate([
            {
                $match: query // Match records based on the query
            },
            {
                $lookup: {
                    from: "farmers",
                    let: { farmerId: { $toString: "$procurementDetails.farmerID" } }, // Ensure both are strings
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [{ $toString: "$external_farmer_id" }, "$$farmerId"] }
                            }
                        },
                        {
                            $project: { _id: 1, external_farmer_id: 1 } // Only fetch necessary fields
                        }
                    ],
                    as: "farmerDetails"
                }
            },
            {
              $lookup:{
                from:'procurementcenters',
                localField:'procurementDetails.mandiName',
                foreignField:'center_name',
                as:'procurementCenter'
              }
            },
            {
                $lookup: {
                    from: "users",
                    let: { organization_name: "$procurementDetails.commisionAgentName" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$basic_details.associate_details.organization_name", "$$organization_name"] }
                            }
                        },
                        {
                            $project: { _id: 1 } // Only fetch necessary fields
                        }
                    ],
                    as: "userDetails"
                }
            },
        {
            $unwind: "$procurementCenter"
        },
            {
                $group: {
                    _id: "$procurementDetails.commisionAgentName",
                    seller_id: { $first: "$userDetails._id" },
                    farmer_data: {
                        $push: {
                            _id: { $arrayElemAt: ["$farmerDetails._id", 0] }, // Ensure single farmer details
                            // farmerID: "$procurementDetails.farmerID",
                            // external_farmer_id: { $arrayElemAt: ["$farmerDetails.external_farmer_id", 0] },
                            qty: { $divide: ["$procurementDetails.gatePassWeightQtl", 10] }, // Convert Qtl to MT
                            gatePassID: "$procurementDetails.gatePassID",
                            jformID: "$procurementDetails.jformID",
                            jformDate: "$procurementDetails.jformDate",
                            procurementId:"$procurementCenter._id",
                        }
                    },
                    total_farmers: {
                        $sum: {
                            $cond: [{ $gt: [{ $arrayElemAt: ["$farmerDetails._id", 0] }, null] }, 1, 0]
                        }
                    }, // Count valid farmers
                    total_ekhrid_farmers: {
                        $sum: {
                            $cond: [{ $gt: ["$procurementDetails.farmerID", null] }, 1, 0]
                        }
                    }, // Count only valid farmers
                    qtyOffered: { $sum: { $divide: ["$procurementDetails.gatePassWeightQtl", 10] } } // Convert Qtl to MT
                }
            }
        ]);

        return res.send(
            new serviceResponse({
                status: 200,
                data: groupedData,
                message: _response_message.found("Associate farmer"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
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
        if (qtyOffered > (product.quantity - fulfilledQty)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Incorrect quantity of request" }] }));
        }
 
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

        console.log("✅ eKharid Records Found:", eKharidRecords.map(r => r.procurementDetails.farmerID)); // Debugging

        // Create a mapping for quick lookup
        const eKharidMap = new Map(eKharidRecords.map(record => [String(record.procurementDetails.farmerID), record]));
 
        let associateOfferRecord = existingRecord;
 
        if (existingRecord) {
            const updatedQty = (existingRecord.offeredQty || 0) + qtyOffered;
            console.log("Updating existing record");
            await AssociateOffers.updateOne(
                { _id: existingRecord._id },
                { offeredQty: updatedQty,
                  procuredQty:updatedQty
                 }
            );
        } else {
            console.log("Creating new record");
            associateOfferRecord = await AssociateOffers.create({
                seller_id,
                req_id,
                offeredQty: qtyOffered,
                procuredQty:qtyOffered,
                createdBy: seller_id,
                status: _associateOfferStatus.accepted
            });
        }
 
        // Update RequestModel fulfilledQty in one go
        const updatedFulfilledQty = handleDecimal(fulfilledQty + sumOfFarmerQty);
        let newStatus = _requestStatus.partially_fulfulled;
        if (updatedFulfilledQty === handleDecimal(product.quantity)) {
            newStatus = _requestStatus.fulfilled;
        } else if (updatedFulfilledQty > handleDecimal(product.quantity)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "This request cannot be processed! Quantity exceeds" }] }));
        }
 
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
