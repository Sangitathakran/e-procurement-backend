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
const { _frontendLoginRoutes } = require('@src/v1/utils/constants');
const { generateRandomPassword } = require('@src/v1/utils/helpers/randomGenerator');
const { sendMail } = require('@src/v1/utils/helpers/node_mailer');

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
  
        if(isUserAlreadyExist){
            return res.send(new serviceResponse({ status: 400, message: "already existed with this mobile number or email in Master", 
                errors: [{ message: _response_message.allReadyExist("already existed with this mobile number or email in Master") }] }))
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
    
        if(savedHeadOffice){
            const masterUser = new MasterUser({
                firstName : authorised.name,
                isAdmin : true,
                email : authorised.email?.trim(),
                mobile : authorised?.mobile?.trim(),
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
            if(!masterUserCreated){
                return sendResponse({res, status: 400, message: "master user not created"})
            }
            await emailService.sendHoCredentialsEmail(emailPayload);
            
        }else{
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