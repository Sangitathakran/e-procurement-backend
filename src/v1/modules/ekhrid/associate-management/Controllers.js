const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const { eKharidHaryanaProcurementModel } = require("@src/v1/models/app/eKharid/procurements");
const { _userType, _userStatus } = require("@src/v1/utils/constants");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { emailService } = require('@src/v1/utils/third_party/EmailServices');
const { generateRandomPassword } = require("@src/v1/utils/helpers/randomGenerator")
const bcrypt = require('bcrypt');
const { sendMail } = require('@src/v1/utils/helpers/node_mailer');
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const xlsx = require('xlsx');


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

module.exports.associateNorthEastBulkuplod = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;
        if (!file) {
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }
        let Associates = [];
        let headers = [];
        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            Associates = xlsx.utils.sheet_to_json(worksheet);
            // console.log(Associates); return false;
            headers = Object.keys(Associates[0]);
        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            const dataContent = lines.slice(1).join('\n');
            const parser = csv({ headers });
            const readableStream = Readable.from(dataContent);
            readableStream.pipe(parser);
            parser.on('data', async (data) => {
                if (Object.values(data).some(val => val !== '')) {
                    const result = await processFarmerRecord(data);
                    if (!result.success) {
                        errorArray = errorArray.concat(result.errors);
                    }
                }
            });
            parser.on('end', () => {
                console.log("Stream end");
            });
            parser.on('error', (err) => {
                console.log("Stream error", err);
            });
        }
        let errorArray = [];
        const procesAssociateRecord = async (rec) => {
            const associate_type = rec["Associate Type"];
            const email = rec["Email ID"];
            const mobile_no = rec["Mobile No."];
            const associate_name = rec["Associate Name"];
            const state = rec["State"];
            const district = rec["District"];
            const country = rec["Country"];
            const taluka = rec["City"];
            const pinCode = rec["Pin Code"];
            const gst_no = rec["GST No."];
            const pan_card = rec["Pan number"];
            const cin_number = rec["Cin Number"];
            const poc = rec["POC"];
            const aadhar_number = rec["Aadhar number"];
            let errors = [];
            let missingFields = [];
            if (!mobile_no) {
                missingFields.push("Mobile No.");
            }
            if (missingFields.length > 0) {
                errors.push({ record: rec, error: `Required fields missing: ${missingFields.join(', ')}` });
            }
            if (!/^\d{10}$/.test(mobile_no)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }
            // if (!/^\d{6,40}$/.test(account_number)) {
            //     errors.push({ record: rec, error: "Invalid Account Number: Must be a numeric value between 6 and 18 digits." });
            // }
            if (errors.length > 0) return { success: false, errors };
            try {
                let existingRecord = await User.findOne({ 'basic_details.associate_details.phone': mobile_no });
                if (existingRecord) {
                    return { success: false, errors: [{ record: rec, error: `Associate with Mobile No. ${mobile_no} already registered.` }] };
                } else {
                    const newUser = new User({
                        client_id: '9876',
                        basic_details: {
                            associate_details: {
                                phone: mobile_no,
                                associate_type: "Organisation",
                                email,
                                organization_name: associate_name,
                            },
                            point_of_contact: {
                                name: poc,
                            },
                        },
                        address: {
                            registered: {
                                country: "INDIA",
                                state,
                                district,
                                taluka,
                                pinCode,
                            }
                        },
                        company_details: {
                            cin_number,
                            gst_no,
                            pan_card,
                            aadhar_number,
                        },
                        user_type: _userType.associate,
                        is_mobile_verified: true,
                        is_approved: 'approved',
                        is_form_submitted: true,
                        is_welcome_email_send: true,
                        term_condition: true,
                        active: true,
                        is_sms_send: true,
                    });
                    await newUser.save();
                }
            } catch (error) {
                console.log(error);
                errors.push({ record: rec, error: error.message });
            }
            return { success: errors.length === 0, errors };
        };
        for (const Associate of Associates) {
            const result = await procesAssociateRecord(Associate);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }
        if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            dumpJSONToExcel(req, res, {
                data: errorData,
                fileName: `associate-error_records.xlsx`,
                worksheetName: `associate-record-error_records`
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "Associate successfully uploaded."
            });
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateOrInsertUsers = async (req, res) => {
    try {
        // Fetch unique commission agent names from procurement records
        const procurements = await eKharidHaryanaProcurementModel.aggregate([
            { $group: { _id: "$procurementDetails.commisionAgentName" } },
            { $match: { _id: { $ne: null } } }
        ]);

        const bulkOps = [];

        // Fetch the last user_code from the User collection
        const lastUser = await User.findOne({}, { user_code: 1 }).sort({ createdAt: -1 });

        let lastCodeNumber = 1; // Default if no users exist

        if (lastUser && lastUser.user_code) {
            lastCodeNumber = parseInt(lastUser.user_code.slice(2), 10) + 1;
        }

        for (const procurement of procurements) {

            const commisionAgentName = procurement._id;
            // Generate the next user_code in sequence
            const nextUserCode = 'AS' + String(lastCodeNumber).padStart(5, '0');
            lastCodeNumber++; // Increment for the next procurement       

            bulkOps.push({
                updateOne: {
                    filter: { "basic_details.associate_details.organization_name": commisionAgentName },
                    update: {
                        $set: { "basic_details.associate_details.organization_name": commisionAgentName },
                        $setOnInsert: {
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

        if (bulkOps.length > 0) {
            await User.bulkWrite(bulkOps);
        }

        return res.send(
            new serviceResponse({
                status: 200,
                message: _response_message.found("Associate uploaded successfully"),
            })
        );
        // console.log("Users collection updated successfully.");
    } catch (error) {
        console.error("Error updating users collection:", error);
    }
};


module.exports.associateFarmerList = async (req, res) => {
    try {
        const groupedData = await eKharidHaryanaProcurementModel.aggregate([
            // {
            //     $lookup: {
            //         from: "farmers",
            //         let: { farmerId: "$procurementDetails.farmerID" },  // Keep as string
            //         pipeline: [
            //             {
            //                 $addFields: {
            //                     external_farmer_id_str: { $toString: "$external_farmer_id" } // Convert numeric to string
            //                 }
            //             },
            //             {
            //                 $match: {
            //                     $expr: { $eq: ["$external_farmer_id_str", "$$farmerId"] } // Match converted values
            //                 }
            //             }
            //         ],
            //         as: "farmerDetails"
            //     }
            // },
            // { $unwind: { path: '$farmerDetails', preserveNullAndEmptyArrays: true } },
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
                            $project: { _id: 1 } // Only fetch _id
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
            {
                $group: {
                    _id: "$procurementDetails.commisionAgentName",
                    userDetails: { $first: "$userDetails._id" },
                    farmer_data: {
                        $push: {
                            _id: "$farmerDetails._id",
                            qty: { $divide: ["$procurementDetails.gatePassWeightQtl", 10] } // Convert Qtl to MT
                        }
                    },
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
