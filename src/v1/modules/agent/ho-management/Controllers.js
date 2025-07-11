const mongoose = require('mongoose');
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { User } = require("@src/v1/models/app/auth/User");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const bcrypt = require('bcrypt');
const { asyncErrorHandler } = require('@src/v1/utils/helpers/asyncErrorHandler');
const { TypesModel } = require('@src/v1/models/master/Types');
const { MasterUser } = require('@src/v1/models/master/MasterUser');
const UserRole = require('@src/v1/models/master/UserRole');
const getIpAddress = require('@src/v1/utils/helpers/getIPAddress');
const { _status, _frontendLoginRoutes } = require('@src/v1/utils/constants');
const { generateRandomPassword } = require('@src/v1/utils/helpers/randomGenerator');
const { sendMail } = require('@src/v1/utils/helpers/node_mailer');
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const xlsx = require("xlsx");
const { validateBranchData } = require("@src/v1/modules/head-office/ho-branch-management/Validations")

module.exports.getHo = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        let query = {
            ...(search ? { 'company_details.name': { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };

        if (paginate == 0) {
            query.active = true
        }
        const records = { count: 0 };
        records.rows = await HeadOffice.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'branches', // Name of the Branches collection in the database
                    localField: '_id',
                    foreignField: 'headOfficeId',
                    as: 'branches'
                }
            },
            {
                $addFields: {
                    branchCount: { $size: '$branches' }
                }
            },
            {
                $lookup: {
                    from: 'schemeassigns', // Name of the Branches collection in the database
                    localField: '_id',
                    foreignField: 'ho_id',
                    as: 'schemeAssigned'
                }
            },
            {
                $addFields: {
                    schemeAssignedCount: { $size: '$schemeAssigned' }
                }
            },
            {
                ...(paginate == 1 && {
                    $project: {
                        _id: 1,
                        office_id: 1,
                        'company_details.name': 1,
                        registered_time: 1,
                        branchCount: 1,
                        'point_of_contact.name': 1,
                        'point_of_contact.email': 1,
                        'point_of_contact.mobile': 1,
                        'point_of_contact.designation': 1,
                        registered_time: 1,
                        head_office_code: 1,
                        active: 1,
                        address: 1,
                        schemeAssignedCount: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }),
                ...(paginate == 0 && {
                    $project: {
                        _id: 1,
                        office_id: 1,
                        'company_details.name': 1,
                        'point_of_contact.name': 1,
                        'point_of_contact.email': 1,
                        'point_of_contact.designation': 1,
                        head_office_code: 1,
                    }
                })
            },
            { $sort: sortBy },
            ...(paginate == 1 ? [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }] : []) // Pagination if required
        ]);

        records.count = await HeadOffice.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Head Office") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.saveHeadOffice = async (req, res) => {
    try {
        const { company_details, point_of_contact, address, authorised } = req.body;
       
        const password = generateRandomPassword();

        // this is to get the type object of head office
        const type = await TypesModel.findOne({ _id: "671100dbf1cae6b6aadc2423" })

        const hashedPassword = await bcrypt.hash(password, 10);
              
        const headOffice = new HeadOffice({
            password: hashedPassword,
            email_verified: false,
            user_type: type.user_type,
            company_details,
            point_of_contact,
            address,
            authorised,
        });
        // checking the existing user in Master User collection
        const isUserAlreadyExist = await MasterUser.findOne(
            { $or: [{ mobile: { $exists: true, $eq: authorised?.mobile?.trim() } }, { email: { $exists: true, $eq: authorised.email.trim() } }] });

        if (isUserAlreadyExist) {
            return res.send(new serviceResponse({
                status: 400, message: "already existed with this mobile number or email in Master",
                errors: [{ message: _response_message.allReadyExist("already existed with this mobile number or email in Master") }]
            }))
        }

        const savedHeadOffice = await headOffice.save();

        // const login_url = `${process.env.FRONTEND_URL}${_frontendLoginRoutes.ho}`
        const login_url = `${_frontendLoginRoutes.ho}`

        const emailPayload = {
            email: savedHeadOffice.authorised.email,
            name: savedHeadOffice.authorised.name,
            password: password,
            login_url: login_url
        }

        if (savedHeadOffice) {
            const masterUser = new MasterUser({
                firstName: authorised.name,
                isAdmin: true,
                email: authorised.email?.trim(),
                mobile: authorised?.phone?.trim(),
                password: hashedPassword,
                user_type: type.user_type,
                userRole: [type.adminUserRoleId],
                createdBy: req.user._id,
                portalId: savedHeadOffice._id,
                ipAddress: getIpAddress(req)
            });
            if (authorised?.phone) {
                masterUser.mobile = authorised?.phone?.trim()
            } else if (authorised?.mobile) {
                masterUser.mobile = authorised?.mobile?.trim()
            }

            const masterUserCreated = await masterUser.save();
            if (!masterUserCreated) {
                return sendResponse({ res, status: 400, message: "master user not created" })
            }
            await emailService.sendHoCredentialsEmail(emailPayload);

        } else {
            throw new Error('Head office not created')

        }

        const subject = `New Head Office Successfully Created under Head Office ID ${savedHeadOffice?.head_office_code}`
        const { line1, line2, state, district, city, pinCode } = savedHeadOffice.address;
        const body = `<p>Dear Admin <Name> </p> <br/>
            <p>This to inform you that a new head office has been successfully created under the following details:</p> <br/>
            <p>Head Office Name: ${savedHeadOffice?.company_details.name} </p> <br/>
            <p>Head Office ID: ${savedHeadOffice?.head_office_code}</p> <br/>
            <p> Location: ${line1} , ${line2}, ${city} , ${district} , ${state} , ${pinCode} </p> <br/>
            <p>Date of Creation: ${savedHeadOffice?.createdAt} </p> <br/>
            <p>Need Help? </p> <br/>
            <p>For queries or any assistance, contact us at ${savedHeadOffice?.point_of_contact.mobile} </p> <br/>
            <p>Warm regards, </p> <br/>
            <p>Navankur</p>`

        await sendMail("ashita@navankur.org", "", subject, body);

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Head Office'), data: savedHeadOffice }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateStatus = asyncErrorHandler(async (req, res) => {
    const { id, status } = req.params

    const record = await HeadOffice.findOne({ _id: id })

    if (!record) {
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Head Office") }] }))
    }

    record.active = status
    record.save()

    return res.send(new serviceResponse({ status: 200, data: record, message: _response_message.updated() }))
})

module.exports.getHeadOfficeById = async (req, res) => {
    try {
        const { id } = req.params; // Get the Head Office ID from the request parameters

        // Validate the Head Office ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: _response_message.invalid("Head Office ID"),
            });
        }

        // Find the head office by ID
        const headOffice = await HeadOffice.findById(id); // If you want to populate the branches

        if (!headOffice) {
            return res.status(404).send(
                new serviceResponse({
                    status: 404,
                    message: _response_message.notFound("Head Office"),
                })
            );
        }

        // Return the found head office details in the response
        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: headOffice,
                message: _response_message.found("Head Office"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.updateHeadOffice = asyncErrorHandler(async (req, res) => {
    const { id } = req.params; // Get the Head Office ID from the request parameters
    const { company_details, point_of_contact, address, authorised, active } = req.body; // Extract fields to update from the request body

    // Validate the Head Office ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: _response_message.invalid("Head Office ID"),
        });
    }

    // Find the head office by ID
    const headOffice = await HeadOffice.findById(id);

    if (!headOffice) {
        return res.status(404).send(
            new serviceResponse({
                status: 404,
                message: _response_message.notFound("Head Office"),
            })
        );
    }

    // Update the fields if provided in the request
    if (company_details) headOffice.company_details = company_details;
    if (point_of_contact) headOffice.point_of_contact = point_of_contact;
    if (address) headOffice.address = address;
    if (authorised) headOffice.authorised = authorised;
    if (typeof active !== "undefined") headOffice.active = active;

    // Save the updated head office record
    const updatedHeadOffice = await headOffice.save();

    // Return the updated head office details in the response
    return res.status(200).send(
        new serviceResponse({
            status: 200,
            data: updatedHeadOffice,
            message: _response_message.updated("Head Office"),
        })
    );
});

module.exports.deleteHO = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
    }

    const record = await HeadOffice.findOne({ _id: id });

    if (!record) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Head Office") }] }))
    }

    await record.deleteOne();

    return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.deleted("Head Office") }));
});

// start of Sangita Code

module.exports.getScheme = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery
    let matchQuery = {
        status: _status.active,
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
            $project: {
                _id: 1,
                schemeId: 1,
                schemeName: {
                    $concat: [
                        "$schemeName", " ",
                        { $ifNull: ["$commodityDetails.name", ""] }, " ",
                        { $ifNull: ["$season", ""] }, " ",
                        { $ifNull: ["$period", ""] }
                    ]
                },
                Schemecommodity: 1,
                season: 1,
                period: 1,
                procurement: 1,
                status: 1
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
                "Scheme Commodity": item?.Schemecommodity || "NA",
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

module.exports.schemeAssign = asyncErrorHandler(async (req, res) => {
    try {
        const { schemeData, ho_id } = req.body;

        // Validate input
        if (!ho_id || !Array.isArray(schemeData) || schemeData.length === 0) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "Invalid request. 'ho_id' and 'schemeData' must be provided.",
            }));
        }

        let updatedRecords = [];
        let newRecords = [];

        for (const { _id, qty } of schemeData) {
            // Find the scheme and validate procurement limit
            const scheme = await Scheme.findById(_id);
            if (!scheme) {
                return res.status(404).send(new serviceResponse({
                    status: 404,
                    message: `Scheme with ID ${_id} not found.`,
                }));
            }

            if (qty > scheme.procurement) {
                return res.status(400).send(new serviceResponse({
                    status: 400,
                    message: `${_id} Assigned quantity (${qty}) cannot exceed procurement limit (${scheme.procurement}) for scheme ${scheme.schemeName}.`,
                }));
            }

            // Check if the record already exists in SchemeAssign
            const existingRecord = await SchemeAssign.findOne({ ho_id, scheme_id: _id });

            if (existingRecord) {
                // Update existing record
                existingRecord.assignQty = qty;
                await existingRecord.save();
                updatedRecords.push(existingRecord);
            } else {
                // Prepare new record for insertion
                newRecords.push({
                    ho_id,
                    scheme_id: _id,
                    assignQty: qty,
                });
            }
        }

        // Bulk insert new records if there are any
        if (newRecords.length > 0) {
            const insertedRecords = await SchemeAssign.insertMany(newRecords);
            updatedRecords = [...updatedRecords, ...insertedRecords];
        }

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: updatedRecords,
                message: _response_message.created("Scheme Assign Updated Successfully"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.getAssignedScheme = asyncErrorHandler(async (req, res) => {

    const { ho_id, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery
    let matchQuery = { ho_id: new mongoose.Types.ObjectId(ho_id) };

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(ho_id)) {
        return res.status(400).json({ message: "Invalid HO Id" });
    }

    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'headoffices',
                localField: 'ho_id',
                foreignField: '_id',
                as: 'headOfficeDetails',
            },
        },
        { $unwind: { path: '$headOfficeDetails', preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "schemes", // Adjust this to your actual collection name for branches
                localField: "scheme_id",
                foreignField: "_id",
                as: "schemeDetails"
            }
        },
        { $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'commodities',
                localField: 'schemeDetails.commodity_id',
                foreignField: '_id',
                as: 'commodityDetails',
            },
        },
        { $unwind: { path: '$commodityDetails', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                schemeId: "$schemeDetails.schemeId",
                schemeName: {
                    $concat: [
                        { $ifNull: [{ $getField: { field: "schemeName", input: "$schemeDetails" } }, ""] }, " ",
                        { $ifNull: [{ $getField: { field: "name", input: "$commodityDetails" } }, ""] }, " ",
                        { $ifNull: [{ $getField: { field: "season", input: "$schemeDetails" } }, ""] }, " ",
                        { $ifNull: [{ $getField: { field: "period", input: "$schemeDetails" } }, ""] }
                    ]
                },
                headofficeName: "$headOfficeDetails.company_details.name",
                scheme_id: 1,
                assignQty: 1
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
    const rows = await SchemeAssign.aggregate(aggregationPipeline);
    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];
    const countResult = await SchemeAssign.aggregate(countPipeline);
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
                "HO ID": item?.schemeName || "NA",
                "assign Qty": item?.assignQty || "NA",
            };
        });
        if (record.length > 0) {
            dumpJSONToExcel(req, res, {
                data: record,
                fileName: `Scheme-record.xlsx`,
                worksheetName: `Scheme-record`
            });
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Scheme Assign") }));
        }
    } else {
        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Scheme Assign") }));
    }

});

module.exports.getBo = asyncErrorHandler(async (req, res) => {

    try {
        const { ho_id, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

        let matchQuery = {
            headOfficeId: new mongoose.Types.ObjectId(ho_id),
            status: _status.active,
            ...(search ? { branchName: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null }),
        };

        let aggregationPipeline = [
            { $match: matchQuery },
            {
                $project: {
                    _id: 1,
                    branchId: 1,
                    branchName: 1,
                    emailAddress: 1,
                    pointOfContact: '$pointOfContact.name',
                    address: 1,
                    state: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1
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
        const rows = await Branches.aggregate(aggregationPipeline);
        const countPipeline = [
            { $match: matchQuery },
            { $count: "total" }
        ];
        const countResult = await Branches.aggregate(countPipeline);
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
                    "branch Id": item?.branchId || "NA",
                    "branch Name": item?.branchName || "NA",
                    "email Address": item?.emailAddress || "NA",
                    "point of contact": item?.point_of_contact.name || "NA",
                    "address": item?.address || "NA",
                    "state": item?.state || "NA"
                };
            });
            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Branch-record.xlsx`,
                    worksheetName: `Branch-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.notFound("Branch") }));
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Branch") }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
})


module.exports.importBranches = async (req, res) => {
    try {

        const { headOfficeId } = req.body;
        // const headOfficeId = req.user.portalId._id;
        if (!headOfficeId) {
            return res.status(403).json({ message: "HeadOffice not found", status: 403 });
        }

        // Check if the file is provided via the global multer setup
        if (!req.files || req.files.length === 0) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.fileMissing }));
        }

        // Access the uploaded file
        const uploadedFile = req.files[0];


        // Read the Excel file using xlsx
        const workbook = xlsx.read(uploadedFile.buffer, { type: 'buffer' });
        const sheet_name_list = workbook.SheetNames;
        const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]); // Convert first sheet to JSON

        // Expected headers
        const expectedHeaders = [
            'branchName', 'emailAddress', 'pointOfContactName', 'pointOfContactPhone', 'pointOfContactEmail',
            'address', 'district', 'cityVillageTown', 'state', 'pincode'
        ];

        // Validate headers
        const fileHeaders = Object.keys(excelData[0] || {});
        const missingHeaders = expectedHeaders.filter(header => !fileHeaders.includes(header));

        if (missingHeaders.length > 0) {
            return res.status(400).send(new serviceResponse({ status: 400, message: `Missing required headers: ${missingHeaders.join(', ')}`, }));
        }

        // Extract all emailAddresses from the Excel data
        const emailAddresses = excelData.map(row => row.emailAddress);

        // Check if any of the email addresses already exist in the database
        const existingBranches = await Branches.find({ emailAddress: { $in: emailAddresses } });

        if (existingBranches.length > 0) {
            // If there are existing email addresses, send an error response with email address details
            const existingEmails = existingBranches.map(branch => branch.emailAddress);
            return res.status(400).json({
                status: 400,
                message: `The following email addresses already exist in the system: ${existingEmails.join(', ')}`,
            });
        }

        const validationError = await validateBranchData(excelData, expectedHeaders, existingBranches);
        if (validationError) {
            return res.status(validationError.status).send(new serviceResponse(validationError));
        }

        // checking duplicate email and mobile number in masterUser collection
        const checkExistingEmailAndPhone = await Promise.all(excelData.map(async (item) => {
            const existingEmail = await MasterUser.findOne({ email: item.pointOfContactEmail })
            const existingMobile = await MasterUser.findOne({ mobile: item.pointOfContactPhone })


            if (existingEmail) {
                return { message: `Email ${existingEmail.email} is already exist in master`, status: true }
            }

            if (existingMobile) {
                return { message: `Mobile number ${existingMobile.mobile} is already exist in master`, status: true }
            }

            return { message: null, status: false }
        }))

        const alreadyExisted = checkExistingEmailAndPhone.find(item => item.status)

        if (alreadyExisted) {
            return sendResponse({ res, status: 400, message: alreadyExisted.message })
        }

        function checkForDuplicates(data) {
            const emailSet = new Set();
            const phoneSet = new Set();
            const duplicates = [];

            data.forEach((item, index) => {
                const { pointOfContactEmail, pointOfContactPhone } = item;

                if (emailSet.has(pointOfContactEmail)) {
                    duplicates.push(`Duplicate email found: ${pointOfContactEmail} at row ${index}`);
                } else {
                    emailSet.add(pointOfContactEmail);
                }

                if (phoneSet.has(pointOfContactPhone)) {
                    duplicates.push(`Duplicate phone found: ${pointOfContactPhone} at row ${index}`);
                } else {
                    phoneSet.add(pointOfContactPhone);
                }
            });

            if (duplicates.length > 0) {
                return duplicates
            }

            return null
        }

        //checking duplicate value in excel data
        const isDuplicate = checkForDuplicates(excelData)
        if (isDuplicate !== null) {
            return sendResponse({ res, status: 400, message: isDuplicate[0] })
        }

        // Parse the rows into Branch objects, with status set to inactive by default
        const branches = await Promise.all(excelData.map(async (row) => {
            const password = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(password, 10);

            return {
                branchName: row.branchName,
                emailAddress: row.emailAddress,
                pointOfContact: {
                    name: row.pointOfContactName,
                    phone: row.pointOfContactPhone,
                    email: row.pointOfContactEmail
                },
                address: row.address,
                cityVillageTown: row.cityVillageTown,
                state: correctStateName(row.state),
                district: row.district,
                pincode: row.pincode,
                status: _status.inactive,
                headOfficeId: headOfficeId,
                password: password,
                hashedPassword: hashedPassword,
            };
        }));
        //this is to get the type object of head office  
        const type = await TypesModel.findOne({ _id: "67110087f1cae6b6aadc2421" })
        // Send an email to each branch email address notifying them that the branch has been created
        const login_url = `${process.env.FRONTEND_URL}${_frontendLoginRoutes.bo}`


        // Insert the branches into the database
        for (const branchData of branches) {
            // checking the existing user in Master User collectio
            const newBranchPayload = {
                branchName: branchData.branchName,
                emailAddress: branchData.emailAddress,
                pointOfContact: {
                    name: branchData.pointOfContact.name,
                    phone: branchData.pointOfContact.phone.toString(),
                    email: branchData.pointOfContact.email
                },
                address: branchData.address,
                cityVillageTown: branchData.cityVillageTown,
                district: branchData.district,
                state: branchData.state,
                pincode: branchData.pincode,
                headOfficeId: headOfficeId,
                password: branchData.hashedPassword,
            }
            const branch = new Branches(newBranchPayload);
            const newBranch = await branch.save();


            if (newBranch._id) {
                const masterUser = new MasterUser({
                    firstName: branchData.pointOfContact.name,
                    isAdmin: true,
                    email: branchData.pointOfContact.email.trim(),
                    mobile: branchData.pointOfContact.phone.toString().trim(),
                    password: branchData.hashedPassword,
                    user_type: type.user_type,
                    createdBy: req.user._id,
                    userRole: [type.adminUserRoleId],
                    portalId: newBranch._id,
                    ipAddress: getIpAddress(req)
                });

                await masterUser.save();

                const emailPayload = {
                    email: branchData.pointOfContact.email,
                    name: branchData.pointOfContact.name,
                    password: branchData.password,
                    login_url: login_url
                }

                await emailService.sendBoCredentialsEmail(emailPayload);

            } else {

                throw new Error("branch office not created")
            }
        }

        return res
            .status(200)
            .send(
                new serviceResponse({
                    status: 200,
                    message: _response_message.importSuccess(),
                    // data:branches
                })
            );
    } catch (err) {
        _handleCatchErrors(err, res);
    }
};

function checkForDuplicates(data) {
    const emailSet = new Set();
    const phoneSet = new Set();
    const duplicates = [];

    data.forEach((item, index) => {
        const { pointOfContactEmail, pointOfContactPhone } = item;

        if (emailSet.has(pointOfContactEmail)) {
            duplicates.push(`Duplicate email found: ${pointOfContactEmail} at row ${index}`);
        } else {
            emailSet.add(pointOfContactEmail);
        }

        if (phoneSet.has(pointOfContactPhone)) {
            duplicates.push(`Duplicate phone found: ${pointOfContactPhone} at row ${index}`);
        } else {
            phoneSet.add(pointOfContactPhone);
        }
    });

    if (duplicates.length > 0) {
        return duplicates
    }

    return null
}

function correctStateName(state) {
    let correctedState = state.replace(/_/g, ' ');

    // Replace "and" with "&" for specific states
    if (
        correctedState === 'Dadra and Nagar Haveli' ||
        correctedState === 'Andaman and Nicobar' ||
        correctedState === 'Daman and Diu' ||
        correctedState === 'Jammu and Kashmir'
    ) {
        correctedState = correctedState.replace('and', '&');
    }

    return correctedState.trim();
}

// End of Sangita Code