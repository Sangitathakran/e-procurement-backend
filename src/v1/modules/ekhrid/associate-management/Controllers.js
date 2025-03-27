const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { _userType, _userStatus, _requestStatus, _webSocketEvents, _procuredStatus, _collectionName } = require("@src/v1/utils/constants");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel, _generateOrderNumber, _addDays, handleDecimal } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { emailService } = require('@src/v1/utils/third_party/EmailServices');
const { generateRandomPassword } = require("@src/v1/utils/helpers/randomGenerator")
const bcrypt = require('bcrypt');
const { sendMail } = require('@src/v1/utils/helpers/node_mailer');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const xlsx = require('xlsx');
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
// const { Batch } = require("@src/v1/models/app/procurement/Batch");
// const { RequestModel } = require("@src/v1/models/app/procurement/Request");

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
            { $match: { _id: { $ne: null }, farmerId: { $ne: null }, "procurementDetails.offerCreatedAt": null } }
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
        if (userBulkOps.length > 0) {
            await User.bulkWrite(userBulkOps);
        }

        if (farmerBulkOps.length > 0) {
            await farmer.bulkWrite(farmerBulkOps);
        }

        return res.send(new serviceResponse({
            status: 200,
            message: _response_message.found("Associates and Farmers uploaded successfully"),
        }));

    } catch (error) {
        console.error("Error updating users and farmers collection:", error);
        return res.status(500).send(new serviceResponse({
            status: 500,
            message: "Internal server error"
        }));
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
                            associate_id: associateDetailsId
                        }
                    }
                });
            }
        }

        // Execute bulk operations

        if (farmerBulkOps.length > 0) {
            await farmer.bulkWrite(farmerBulkOps);
        }

        return res.send(new serviceResponse({
            status: 200,
            message: _response_message.found("Associates and Farmers uploaded successfully"),
        }));

    } catch (error) {
        console.error("Error updating users and farmers collection:", error);
        return res.status(500).send(new serviceResponse({
            status: 500,
            message: "Internal server error"
        }));
    }
};

module.exports.associateFarmerList = async (req, res) => {
    try {
        const groupedData = await eKharidHaryanaProcurementModel.aggregate([
            {
                $lookup: {
                    from: "farmers",
                    let: { farmerId: "$procurementDetails.farmerID" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [{ $toString: "$external_farmer_id" }, "$$farmerId"] }
                            }
                        },
                        {
                            $project: { _id: 1, external_farmer_id: 1 } // Only fetch _id
                        }
                    ],
                    as: "farmerDetails"
                }
            },
            { $unwind: { path: "$farmerDetails", preserveNullAndEmptyArrays: true } },
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
                            $project: { _id: 1 } // Only fetch _id
                        }
                    ],
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            { $match: { "$procurementDetails.offerCreatedAt" : null } }, // Exclude records with no farmer
            {
                $group: {
                    _id: "$procurementDetails.commisionAgentName",
                    seller_id: { $first: "$userDetails._id" },
                    farmer_data: {
                        $push: {
                            _id: "$farmerDetails._id",
                            farmerID: "$procurementDetails.farmerID",
                            external_farmer_id: "$farmerDetails.external_farmer_id",
                            qty: { $divide: ["$procurementDetails.gatePassWeightQtl", 10] } // Convert Qtl to MT
                        }
                    },
                    total_farmers: { $sum: { $cond: [{ $gt: ["$farmerDetails._id", null] }, 1, 0] } }, // Count only valid farmers
                    total_ekhrid_farmers: { $sum: { $cond: [{ $gt: ["$procurementDetails.farmerID", null] }, 1, 0] } }, // Count only valid farmers
                    qtyOffered: { $sum: { $divide: ["$procurementDetails.gatePassWeightQtl", 10] } } // Convert Qtl to MT
                }
            }
        ]);


        return res.send(
            new serviceResponse({
                status: 200,
                data: groupedData,
                message: _response_message.found("Associate farmer data successfully"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.createOfferOrder = async (req, res) => {
    try {

        const existingRecord = await AssociateOffers.findOne({ seller_id: data.seller_id, req_id: req_id });
        let associateOfferRecord;

        if (existingRecord) {
            existingRecord.offeredQty = data.qtyOffered;
            associateOfferRecord = existingRecord.save();
            // update request's fulfilledQty and status
            const existingRequestModel = await RequestModel.findOne({ _id: req_id });

            existingRequestModel.fulfilledQty = handleDecimal(existingRequestModel.fulfilledQty + sumOfFarmerQty);
            if (handleDecimal(existingRequestModel.fulfilledQty) == handleDecimal(existingRequestModel?.product?.quantity)) {
                existingRequestModel.status = _requestStatus.fulfilled;
            } else if (handleDecimal(existingRequestModel.fulfilledQty) < handleDecimal(existingRequestModel?.product?.quantity)) {
                existingRequestModel.status = _requestStatus.partially_fulfulled;
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "this request cannot be processed! quantity exceeds" }] }));
            }
            await existingRequestModel.save();

            const dataToBeInserted = [];
            const offerToBeInserted = [];

            for (let harvester of data.farmer_data) {

                const existingFarmer = await farmer.findOne({ _id: harvester._id });
                const { name, father_name, address_line, mobile_no, farmer_code } = existingFarmer;

                const metaData = { name, father_name, address_line, mobile_no, farmer_code };

                const FarmerOfferData = {
                    associateOffers_id: existingRecord._id,
                    farmer_id: harvester._id,
                    metaData,
                    offeredQty: handleDecimal(harvester.qty),
                    order_no: "OD" + _generateOrderNumber(),
                    status: _procuredStatus.received,
                }

                const FarmerOffer = {
                    associateOffers_id: existingRecord._id,
                    farmer_id: harvester._id,
                    metaData,
                    offeredQty: handleDecimal(harvester.qty),
                    createdBy: user_id,
                }

                dataToBeInserted.push(FarmerOfferData);

                offerToBeInserted.push(FarmerOffer);
            }

            await FarmerOrders.insertMany(dataToBeInserted);

            await FarmerOffers.insertMany(offerToBeInserted);
        } else {

            associateOfferRecord = await AssociateOffers.create({ seller_id: data.seller_id, req_id: req_id, offeredQty: data.qtyOffered, createdBy: data.seller_id });

            const dataToBeInserted = [];
            const offerToBeInserted = [];

            for (let harvester of farmer_data) {

                const existingFarmer = await farmer.findOne({ _id: harvester._id });
                const { name, father_name, address_line, mobile_no, farmer_code } = existingFarmer;

                const metaData = { name, father_name, address_line, mobile_no, farmer_code };

                const FarmerOfferData = {
                    associateOffers_id: associateOfferRecord._id,
                    farmer_id: harvester._id,
                    metaData,
                    offeredQty: handleDecimal(harvester.qty),
                    order_no: "OD" + _generateOrderNumber(),
                    status: _procuredStatus.received,
                }

                const FarmerOffer = {
                    associateOffers_id: associateOfferRecord._id,
                    farmer_id: harvester._id,
                    metaData,
                    offeredQty: handleDecimal(harvester.qty),
                    createdBy: data.seller_id,
                }

                dataToBeInserted.push(FarmerOfferData);
                offerToBeInserted.push(FarmerOffer);
            }

            await FarmerOrders.insertMany(dataToBeInserted);
            await FarmerOffers.insertMany(offerToBeInserted);
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}