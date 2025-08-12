const mongoose = require('mongoose');
const { User } = require("@src/v1/models/app/auth/User");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
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
            // bank_details: { $ne: null }
        };

        // If there's a search term, add it to the match query
        if (search) {
            matchQuery['$or'] = [
                { 'basic_details.associate_details.organization_name': { $regex: search, $options: 'i' } },
                { 'user_code': { $regex: search, $options: 'i' } }
            ];
        }
        

        // Aggregation pipeline to join farmers and procurement centers and get counts
        const records = await User.aggregate([
            { $match: matchQuery },
            { $sort: sortBy }, // Sort by the provided field
           // { $skip: skip }, 
           // { $limit: parseInt(limit) }, 
           ...(isExport != 1 ? [
            { $skip: skip },
            { $limit: parseInt(limit) }
             ] : []),

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
                    procurementCenters: 0, // Exclude the procurement centers array

                }
            }
        ]);
        // Get total count of documents for pagination purposes
        const totalRecords = await User.countDocuments(matchQuery);
        // Pagination information
        const totalPages = Math.ceil(totalRecords / limit);

        if (isExport == 1) {
            const record = records.map((item) => {
                // const { name, email, mobile } = item?.basic_details.point_of_contact;

                // const { line1, line2, district, state, country } = item.address.registered

                return {
                    "Associate Id": item?.user_code || "NA",
                    "Organization Name": item?.basic_details?.associate_details?.associate_name || "NA",
                    "Associate Name": item?.basic_details?.associate_details?.organization_name || item?.basic_details?.associate_details?.associate_name,
                    "Associated Farmer": item?.farmersCount || "NA",
                    "Procurement Center": item?.procurementCentersCount || "NA",
                    // "Point Of Contact": `${name} , ${email} , ${mobile}` || "NA",
                    // "Address": `${line1} , ${line2} , ${district} , ${state} , ${country}` || "NA",
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

module.exports.userStatusUpdate = async (req, res) => {
    try {
        const { userId, status } = req.body;
        if (!userId) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _middleware.require('user id') }] }));
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid('user id') }] }));
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send(new serviceResponse({ status: 404, errors: [{ message: _response_message.notFound('User') }] }));
        }

        if (!Object.values(_userStatus).includes(status)) {
            return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.invalid('Status') }));
        }
        user.is_approved = status;


        const password = generateRandomPassword();

        const hashedPassword = await bcrypt.hash(password, 10);
        const masterUser = new MasterUser({
            firstName: user?.basic_details?.associate_details?.associate_name || '',
            lastName: user?.basic_details?.associate_details?.associate_name || '',
            isAdmin: true,
            email: user?.basic_details?.associate_details?.email?.trim() || '',
            mobile: user?.basic_details?.associate_details?.phone?.trim() || '',
            password: hashedPassword,
            user_type: _userType.associate,
        });

        await masterUser.save();

        const subject = `New Onboarding Request ${user?.user_code} Received `;
        const body = `<p> Dear <Name> </p> <br/>
            <p>You have received a new onboarding request from:  </p> <br/> 
            <p> Associate Name: ${user?.basic_details.associate_details.associate_name}  </p> <br/> 
            <p> Associate ID: ${user?.user_code}  </p> <br/>
            <p> Please review the request and take action by approving or rejecting it. Click on the following link to take action- <a href="https://ep-testing.navbazar.com/associate-details"> Click here </a> </p> <br/> 
            <p> Warm regards,  </p> <br/> 
            <p> Navankur.</p> ` ;

         if(user?.basic_details?.associate_details?.email){
            emailService.sendWelcomeEmail(user);
            user.is_welcome_email_send = true;
            await sendMail(user?.basic_details?.associate_details?.email, null, subject, body);
         }
         await user.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: _response_message.updated('User status'), data: { userId, user_status: status } }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.statusUpdate = async (req, res) => {

    try {

        const { id, status } = req.body;

        if (!id) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notProvided("id") }] }))
        }

        const existingUser = await User.findOne({ _id: id });

        if (!existingUser) {
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("user") }] }))
        }

        existingUser.active = status;

        await existingUser.save();

        return res.status(200).send(new serviceResponse({ status: 200, data: existingUser, message: _response_message.updated("status") }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.pendingRequests = async (req, res) => {

    try {

        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query

        let query = search ? {
            $or: [
                { "basic_details.associate_details.organization_name": { $regex: search, $options: 'i' } },
                { "user_code": { $regex: search, $options: 'i' } },
                { "basic_details.associate_details.associate_type": { $regex: search, $options: 'i' } },
            ]
        } : {};

        query.is_approved = { $in: [_userStatus.pending, _userStatus.rejected] };
        query.is_form_submitted = true

        const records = { count: 0 };

        records.rows = paginate == 1 ? await User.find(query).select("user_code basic_details is_approved is_form_submitted")
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await User.find(query).sort(sortBy).select("user_code basic_details is_approved is_form_submitted");

        records.count = await User.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("pending request") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getAssociatesById = async (req, res) => {

    try {

        const { id } = req.params;

        if (!id) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _middleware.require('id') }));
        }
        const response = await User.findById({ _id: id });

        if (!response) {
            return res.status(400).send(new serviceResponse({ status: 400, message: _response_message.notFound('User') }));
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, message: _query.get("data"), data: response }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.bulkuplodAssociate = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;

        if (!file) {
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }

        let associate = [];
        let headers = [];

        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            associate = xlsx.utils.sheet_to_json(worksheet);
            headers = Object.keys(associate[0]);
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
                    const result = await processRecord(data);
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
        const processRecord = async (rec) => {
            const organization_name = rec["Organization Name*"] || null;
            const name = rec["Name*"] || null;
            const cbbo_name = rec["CBBO"] || null;
            const implementation_agency = rec["Implementation Agency"] || null;
            const company_pan = rec["Company PAN*"] || null;
            const company_cin = rec["Company CIN*"] || null;
            const email = rec["Email ID*"] || null;
            const company_mobile = rec["Company Mobile Number*"] || null;
            const company_address = rec["Company Registered address*"] || null;
            const pincode = rec["Pincode*"] || null;
            const state = rec["State*"] || null;
            const district = rec["District*"] || null;
            const city = rec["Village/Town/City"] || null;

            const owner_name = rec["Owner Name*"] || null;
            const owner_aadhar = rec["Owner Aadhar Number*"] || null;
            const owner_pan = rec["Owner PAN Number*"] || null;

            const poc_name = rec["POC Name*"] || null;
            const poc_designation = rec["PocDesignation"] || null;
            const poc_mobile = rec["POC Mobile Number*"] || null;
            const poc_email = rec["PocEmail*"] || null;
            const poc_aadhar = rec["POC Aadhar Number*"] || null;

            const auth_name = rec["Authorized Person Name*"] || null;
            const auth_designation = rec["AuthDesignation"] || null;
            const auth_mobile = rec["Mobile Number*"] || null;
            const auth_email = rec["AuthEmail*"] || null;
            const auth_aadhar = rec["Authorized Person Aadhar Number*"] || null;
            const auth_pan = rec["Authorized Person PAN Number"] || null;

            const bank_name = rec["Bank Name*"] || null;
            const branch_name = rec["Branch Name*"] || null;
            const account_holder_name = rec["Account Holder Name*"] || null;
            const ifsc_code = rec["IFSC Code*"] || null;
            const account_number = rec["Account Number*"] || null;
            const confirm_account_number = rec["Confirm Account Number*"] || null;
            const requiredFields = [
                { field: "Organization Name*", label: "Organization Name" },
                { field: "Name*", label: "Name" },
                { field: "Company PAN*", label: "Company PAN" },
                { field: "Company CIN*", label: "Company CIN" },
                { field: "Email ID*", label: "Email ID" },
                { field: "Company Mobile Number*", label: "Company Mobile Number" },
                { field: "Company Registered address*", label: "Company Registered Address" },
                { field: "Pincode*", label: "Pincode" },
                { field: "State*", label: "State" },
                { field: "District*", label: "District" },
                { field: "Village/Town/City", label: "Village/Town/City" },
                { field: "Owner Name*", label: "Owner Name" },
                { field: "Owner Aadhar Number*", label: "Owner Aadhar Number" },
                { field: "Owner PAN Number*", label: "Owner PAN Number" },
                { field: "POC Name*", label: "POC Name" },
                { field: "Designation", label: "POC Designation" },
                { field: "POC Mobile Number*", label: "POC Mobile Number" },
                { field: "PocEmail*", label: "POC Email" },
                { field: "POC Aadhar Number*", label: "POC Aadhar Number" },
                { field: "Authorized Person Name*", label: "Authorized Person Name" },
                { field: "Designation", label: "Authorized Person Designation" },
                { field: "Mobile Number*", label: "Authorized Person Mobile Number" },
                { field: "AuthEmail*", label: "Authorized Person Email" },
                { field: "Authorized Person Aadhar Number*", label: "Authorized Person Aadhar Number" },
                { field: "Bank Name*", label: "Bank Name" },
                { field: "Branch Name*", label: "Branch Name" },
                { field: "Account Holder Name*", label: "Account Holder Name" },
                { field: "IFSC Code*", label: "IFSC Code" },
                { field: "Account Number*", label: "Account Number" },
                { field: "Confirm Account Number*", label: "Confirm Account Number" }
            ];

            let errors = [];
            let missingFields = [];

            requiredFields.forEach(({ field, label }) => {
                if (!rec[field]) missingFields.push(label);
            });

            if (missingFields.length > 0) {
                errors.push({ record: rec, error: `Required fields missing: ${missingFields.join(', ')}` });
            }
            if (!/^\d{12}$/.test(poc_aadhar)) {
                errors.push({ record: rec, error: "Invalid Aadhar Number" });
            }
            if (!/^\d{6,20}$/.test(account_number)) {
                errors.push({ record: rec, error: "Invalid Account Number: Must be a numeric value between 6 and 20 digits." });
            }
            if (!/^\d{10}$/.test(poc_mobile)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }
            if (!String(account_number).trim() || !String(confirm_account_number).trim()) {
                errors.push("Account Number and Confirm Account Number are required.");
            } else if (String(account_number).trim() !== String(confirm_account_number).trim()) {
                errors.push("Account Number and Confirm Account Number must match.");
            }

            if (errors.length > 0) return { success: false, errors };
            try {

                let existingRecord = await User.findOne({ 'basic_details.point_of_contact.mobile': poc_mobile });
                if (existingRecord) {
                    return { success: false, errors: [{ record: rec, error: `Associate  with Mobile No. ${poc_mobile} already registered.` }] };

                } else {
                    const newAssociate = new User({
                        client_id: '9876',
                        basic_details: {
                            associate_details: {
                                organization_name: organization_name,
                                associate_name: name,
                                email,
                                phone: company_mobile,
                            },
                            point_of_contact: {
                                name: poc_name,
                                email: poc_email,
                                mobile: poc_mobile,
                                designation: poc_designation,
                                aadhar_number: poc_aadhar,
                            },
                            company_owner_info: {
                                name: owner_name,
                                aadhar_number: owner_aadhar,
                                pan_card: owner_pan,
                            },
                            implementation_agency,
                            cbbo_name
                        },
                        company_details: {
                            cin_number: company_cin,
                            pan_card: company_pan,
                        },
                        authorised: {
                            name: auth_name,
                            designation: auth_designation,
                            phone: auth_mobile,
                            email: auth_email,
                            aadhar_number: auth_aadhar,
                            pan_card: auth_pan,
                        },
                        address: {
                            registered: {
                                line1: company_address,
                                country: 'India',
                                state,
                                district,
                                taluka: city,
                                pinCode: pincode,
                            },
                        },
                        bank_details: {
                            bank_name,
                            branch_name,
                            account_holder_name,
                            ifsc_code,
                            account_number,
                        },
                        user_code: null,
                        user_type: _userType.associate,
                        is_mobile_verified: true,
                        is_email_verified: false,
                        is_approved: _userStatus.approved,
                        is_form_submitted: true,
                        active: true,
                        is_welcome_email_send: "true",
                        is_sms_send: "true",
                        term_condition: "true"
                    });
                    await newAssociate.save();
                }

            } catch (error) {
                console.log(error)
                errors.push({ record: rec, error: error.message });
            }

            return { success: errors.length === 0, errors };
        };

        for (const associates of associate) {
            const result = await processRecord(associates);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }

        if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            // console.log("error data->",errorData)
            dumpJSONToExcel(req, res, {
                data: errorData,
                fileName: `Associate-error_records.xlsx`,
                worksheetName: `Associate-record-error_records`
            });
        } else {
            return res.status(200).json({
                status: 200,
                data: {},
                message: "Associates successfully uploaded."
            });
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