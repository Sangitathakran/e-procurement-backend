const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { mongoose } = require("mongoose");
const { MasterUser } = require("@src/v1/models/master/MasterUser");
const bcrypt = require('bcryptjs');
const { generateRandomPassword } = require("@src/v1/utils/helpers/randomGenerator");
const { _frontendLoginRoutes } = require("@src/v1/utils/constants");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const { TypesModel } = require("@src/v1/models/master/Types");

module.exports.createSLA = asyncErrorHandler(async (req, res) => {
    try {
      const data = req.body;
  
      // Required fields validation
      const requiredFields = [
        'basic_details.name',
        'basic_details.email',
        'basic_details.mobile',
        'company_owner_information.owner_name',
        'company_owner_information.mobile',
        'company_owner_information.email',
        'company_owner_information.aadhar_number',
        'company_owner_information.pan_card',
        'point_of_contact.name',
        'point_of_contact.designation',
        'point_of_contact.mobile',
        'point_of_contact.email',
        'point_of_contact.aadhar_number',
        'address.line1',
        'address.pinCode',
        'address.state',
        'address.district',
        'address.city',
        // "address.country",
        'operational_address.line1',
        'operational_address.pinCode',
        'operational_address.state',
        'operational_address.district',
        'operational_address.city',
        // "operational_address.country",
        'company_details.registration_number',
        'company_details.cin_image',
        'company_details.pan_card',
        'company_details.pan_image',
        'authorised.name',
        'authorised.designation',
        'authorised.email',
        'authorised.aadhar_number',
        'authorised.aadhar_certificate.front',
        'authorised.aadhar_certificate.back',
        'bank_details.bank_name',
        'bank_details.branch_name',
        'bank_details.ifsc_code',
        'bank_details.account_number',
        'bank_details.proof',
        // "slaId",
        // "schemes.scheme",
        // "schemes.cna",
        // "schemes.branch"
      ];
  
      const missingFields = requiredFields.filter(field => {
        const keys = field.split('.');
        let value = data;
        for (let key of keys) {
          if (
            value[key] === undefined ||
            value[key] === null ||
            value[key] === ''
          ) {
            return true;
          }
          value = value[key];
        }
        return false;
      });
  
      if (missingFields.length > 0) {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            message: `Missing required fields: ${missingFields.join(', ')}`,
            data: null,
          })
        );
      }

      const existUser = await SLAManagement.findOne({
        'basic_details.email': data.basic_details.email,
      });
      if (existUser) {
        return res.send(
          new serviceResponse({
            status: 400,
            errors: [{ message: _response_message.allReadyExist('Email') }],
          })
        );
      }
 
      // checking the existing user in Master User collection
      const isUserAlreadyExist = await MasterUser.findOne({
        $or: [
          { mobile: { $exists: true, $eq: data.basic_details.mobile.trim() } },
          { email: { $exists: true, $eq: data.basic_details.email.trim() } },
        ],
      });

      if (isUserAlreadyExist) {
        return sendResponse({
          res,
          status: 400,
          message:
            'user already existed with this mobile number or email in Master',
        });
      }
      
      const type = await TypesModel.findOne({ _id: '67110114f1cae6b6aadc2425' });
       if(!type){
        return sendResponse({
            res,
            status: 400,
            message:
              'could not find type for _id: 67110114f1cae6b6aadc2425',
          });
       }
      // Create SLA document
      const sla = await SLAManagement.create(data);
  
      if (!sla?._id) {
        await SLAManagement.deleteOne({ _id: sla._id });
        throw new Error('Agency not created ');
      }
      // create master user document
      const password = generateRandomPassword();
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const login_url = `${_frontendLoginRoutes.agent}`;
      const emailPayload = {
        email: data.basic_details.email,
        user_name: data.basic_details.name,
        name: data.basic_details.name,
        password: password,
        login_url: login_url,
      };
  
      const masterUser = new MasterUser({
        firstName: data.basic_details.name,
        isAdmin: true,
        email: data.basic_details.email.trim(),
        mobile: data.basic_details.mobile.trim(),
        password: hashedPassword,
        user_type: type.user_type,
        createdBy: req.user._id,
        userRole: [type.adminUserRoleId],
        portalId: sla._id,
        ipAddress: getIpAddress(req),
      });
  
      await masterUser.save();
  
      await emailService.sendAgencyCredentialsEmail(emailPayload);
  
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: sla,
          message: _response_message.created('SLA'),
        })
      );
    } catch (error) {
      _handleCatchErrors(error, res);
    }
  });
  

module.exports.getSLAList = asyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;
 
    // Initialize matchQuery
    let matchQuery = search ? {
        $or: [
            { "slaId": { $regex: search, $options: "i" } }, 
            { "basic_details.name": { $regex: search, $options: "i" } },
            { "basic_details.email": { $regex: search, $options: "i" } },
            { "basic_details.mobile": { $regex: search, $options: "i" } }
        ],
        deletedAt: null
    }
        : { deletedAt: null };


    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $project: {
                _id: 1,
                slaId: 1,
                email: '$basic_details.email',
                sla_name: "$basic_details.name",
                associate_count: { $size: "$associatOrder_id" }, // Count of associated orders
                address: {
                    $concat: [
                        "$address.line1", ", ",
                        { $ifNull: ["$address.line2", ""] }, ", ",
                        "$address.city", ", ",
                        "$address.district", ", ",
                        "$address.state", ", ",
                        "$address.pinCode", ", ",
                        { $ifNull: ["$address.country", ""] }, ", ",
                    ]
                },
                status: 1,
                poc: "$point_of_contact.name",
                branch: "$schemes.branch"
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
    const rows = await SLAManagement.aggregate(aggregationPipeline);
    const countPipeline = [
        { $match: matchQuery },
        { $count: "total" }
    ];
    const countResult = await SLAManagement.aggregate(countPipeline);
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

module.exports.deleteSLA = asyncErrorHandler(async (req, res) => {
    try {
        const { slaId } = req.params; // Get SLA ID from URL params

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        // Find and delete SLA by slaId or _id
        const deletedSLA = await SLAManagement.findOneAndDelete({ $or: [{ slaId }, { _id: slaId }] });

        if (!deletedSLA) {
            return res.status(404).json(new serviceResponse({
                status: 404,
                message: "SLA record not found"
            }));
        }

        return res.status(200).json(new serviceResponse({
            status: 200,
            message: "SLA record deleted successfully"
        }));

    } catch (error) {
        console.error("Error deleting SLA:", error);
        return res.status(500).json(new serviceResponse({
            status: 500,
            error: "Internal Server Error"
        }));
    }
});

module.exports.updateSLA = asyncErrorHandler(async (req, res) => {
    try {
        const { slaId } = req.params;
        const updateData = req.body;

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        // Find and update SLA
        const updatedSLA = await SLAManagement.findOneAndUpdate(
            { $or: [{ slaId }, { _id: slaId }] },
            { $set: updateData },
            { new: true, runValidators: true } // Return updated doc
        );
        if (!updatedSLA) {
            return res.status(404).json(new serviceResponse({
                status: 404,
                message: "SLA record not found"
            }));
        }

        return res.status(200).json(new serviceResponse({
            status: 200,
            message: "SLA record updated successfully",
            data: updatedSLA
        }));

    } catch (error) {
        console.error("Error updating SLA:", error);
        return res.status(500).json(new serviceResponse({
            status: 500,
            error: "Internal Server Error"
        }));
    }
});

module.exports.getSLAById = asyncErrorHandler(async (req, res) => {
    try {
        const { slaId } = req.params; // Get SLA ID from URL params

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        // Find SLA with selected fields
        const sla = await SLAManagement.findOne(
            { $or: [{ slaId }, { _id: slaId }] },
            {
                _id: 1,
                slaId: 1,
                "basic_details.name": 1,
                associatOrder_id: 1,
                address: 1,
                status: 1
            }
        );

        if (!sla) {
            return res.status(404).json(new serviceResponse({
                status: 404,
                message: "SLA record not found"
            }));
        }

        // Transform response
        const response = {
            _id: sla._id,
            slaId: sla.slaId,
            sla_name: sla.basic_details.name,
            accociate_count: sla.associatOrder_id.length,
            address: `${sla.address.line1}, ${sla.address.city}, ${sla.address.state}, ${sla.address.country}`,
            status: sla.status
        };

        return res.status(200).json(new serviceResponse({
            status: 200,
            message: "SLA record retrieved successfully",
            data: response
        }));

    } catch (error) {
        console.error("Error fetching SLA:", error);
        return res.status(500).json(new serviceResponse({
            status: 500,
            error: "Internal Server Error"
        }));
    }
});

module.exports.updateSLAStatus = asyncErrorHandler(async (req, res) => {
    try {
        const { slaId } = req.params; // Get SLA ID from URL params
        const { status } = req.body; // New status (true/false)

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        if (typeof status !== "boolean") {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "Status must be true or false"
            }));
        }

        // Find and update SLA status
        const updatedSLA = await SLAManagement.findOneAndUpdate(
            { $or: [{ slaId }, { _id: slaId }] },
            { $set: { status: status } },
            { new: true }
        );

        if (!updatedSLA) {
            return res.status(404).json(new serviceResponse({
                status: 404,
                message: "SLA record not found"
            }));
        }

        return res.status(200).json(new serviceResponse({
            status: 200,
            message: `SLA status updated to ${status ? "Active" : "Inactive"}`,
            data: { slaId: updatedSLA.slaId, status: updatedSLA.active }
        }));

    } catch (error) {
        console.error("Error updating SLA status:", error);
        return res.status(500).json(new serviceResponse({
            status: 500,
            error: "Internal Server Error"
        }));
    }
});

module.exports.addSchemeToSLA = asyncErrorHandler(async (req, res) => {
    try {
        const { slaId } = req.params;
        const { scheme, cna, branch } = req.body;

        // Validate input
        if (!scheme || !cna || !branch) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "Missing required fields: scheme, cna, branch"
            }));
        }

        // Find SLA and update with new scheme
        const updatedSLA = await SLAManagement.findOneAndUpdate(
            { $or: [{ slaId }, { _id: slaId }] },
            { $push: { schemes: { scheme, cna, branch } } },
            { new: true }
        )
            .populate("schemes.scheme", "name")
            .populate("schemes.cna", "name")
            .populate("schemes.branch", "name");

        if (!updatedSLA) {
            return res.status(404).json({
                status: 404,
                message: "SLA not found"
            });
        }

        return res.status(200).json(new serviceResponse({
            status: 200,
            message: "Scheme added successfully",
            data: updatedSLA
        }));

    } catch (error) {
        console.error("Error adding scheme to SLA:", error);
        return res.status(500).json(new serviceResponse({
            status: 500,
            error: "Internal Server Error"
        }));
    }
});

module.exports.schemeAssign = asyncErrorHandler(async (req, res) => {
    try {
        const { schemeData, cna_id, bo_id, slaId, sla_id } = req.body;

        // Validate input
        if (!bo_id || !Array.isArray(schemeData) || schemeData.length === 0) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: "Invalid request. 'bo_id' and 'schemeData' must be provided.",
            }));
        }

        // Prepare data for bulk insert
        const recordsToInsert = schemeData.map(({ _id, qty }) => ({
            bo_id, ho_id: cna_id, sla_id: sla_id,
            scheme_id: _id, // Assuming _id refers to scheme_id
            assignQty: qty,
        }));

        // Use Mongoose's insertMany to insert multiple documents
        const records = await SchemeAssign.insertMany(recordsToInsert);

        return res.status(200).send(
            new serviceResponse({
                status: 200,
                data: records,
                message: _response_message.created("Scheme Assign"),
            })
        );
    } catch (error) {
        _handleCatchErrors(error, res);
    }
});

module.exports.getAssignedScheme = async (req, res) => {
    const { slaId, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

    // Initialize matchQuery
    let matchQuery = { sla_id: new mongoose.Types.ObjectId(slaId) };

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(slaId)) {
        return res.status(400).json({ message: "Invalid SLA ID" });
    }

    let aggregationPipeline = [
        { $match: matchQuery },
        {
            $lookup: {
                from: 'branches',
                localField: 'bo_id',
                foreignField: '_id',
                as: 'branchDetails',
            },
        },
        { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
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
                from: "headoffices", // Adjust this to your actual collection name for branches
                localField: "ho_id",
                foreignField: "_id",
                as: "headOfficeDetails"
            }
        },
        { $unwind: { path: "$headOfficeDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                schemeId: '$schemeDetails.schemeId',
                // schemeName: '$schemeDetails.schemeName',
                schemeName: {
                    $concat: [
                        "$schemeDetails.schemeName", "",
                        { $ifNull: ["$schemeDetails.commodityDetails.name", ""] }, "",
                        { $ifNull: ["$schemeDetails.season", ""] }, "",
                        { $ifNull: ["$schemeDetails.period", ""] }
                    ]
                },
                branchName: '$branchDetails.branchName',
                headOfficeName: "$headOfficeDetails.company_details.name",
                createdOn: '$createdAt'
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
                "schemeName": item?.schemeName || "NA",
                "branchName": item?.branchName || "NA",
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
}

