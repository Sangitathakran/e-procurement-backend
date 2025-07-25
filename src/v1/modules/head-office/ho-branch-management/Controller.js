const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");
const { MasterUser } = require("@src/v1/models/master/MasterUser");

const {
  _response_message,
  _middleware,
  _auth_module,
} = require("@src/v1/utils/constants/messages");

const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");

const xlsx = require("xlsx");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer");
const { _status, _userType, _frontendLoginRoutes } = require("@src/v1/utils/constants");
const { validateBranchData } = require("@src/v1/modules/head-office/ho-branch-management/Validations")
const { generateRandomPassword } = require('@src/v1/utils/helpers/randomGenerator');
const bcrypt = require('bcrypt');
const { TypesModel } = require("@src/v1/models/master/Types");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const getIpAddress = require("@src/v1/utils/helpers/getIPAddress");
const { Scheme } = require("@src/v1/models/master/Scheme");
const { SchemeAssign } = require("@src/v1/models/master/SchemeAssign");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { mongoose } = require("mongoose");

module.exports.importBranches = async (req, res) => {
  try {
    const headOfficeId = req.user.portalId._id;
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

module.exports.exportBranches = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const { user_id, portalId } = req;

    let query = {
      headOfficeId: portalId,
      ...(search ? { branchName: { $regex: search, $options: 'i' } } : {})
    };


    const branches = await Branches.find(query, 'branchId branchName emailAddress pointOfContact address district cityVillageTown state pincode status createdAt')
    .sort({ createdAt: -1 });
    // Format the data to be exported
    const branchData = branches.map((branch) => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      state: branch.state,
      email: branch.emailAddress,
      pointOfContactName: branch.pointOfContact.name,
      address: branch.address,
      //  id: branch._id.toString(),
      // district: branch.district,
      // cityVillageTown: branch.cityVillageTown,
      // pincode: branch.pincode,
      // pointOfContactPhone: branch.pointOfContact.phone,
      // pointOfContactEmail: branch.pointOfContact.email,
      // status: branch.status || _status.inactive,
      // createdAt: new Date(branch.createdAt).toLocaleString('en-GB', {
      //   year: 'numeric',
      //   month: '2-digit',
      //   day: '2-digit',
      //   hour: '2-digit',
      //   minute: '2-digit',
      //   second: '2-digit'
      // })
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(branchData);

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Branches');

    // Write the workbook to a buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="branches.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send the file buffer to the client
    return res.status(200).send(excelBuffer);
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.downloadTemplate = async (req, res) => {
  try {

    const templateData = [
      {
        branchName: 'Example Branch 1',
        emailAddress: 'example1@domain.com',
        pointOfContactName: 'User Name 1',
        pointOfContactPhone: '1234567890',
        pointOfContactEmail: 'user1@example.com',
        address: 'Noida',
        district: 'District 1',
        cityVillageTown: 'Sample Town 1',
        state: 'State 1',
        pincode: '123456'
      },
      {
        branchName: 'Example Branch 2',
        emailAddress: 'example2@domain.com',
        pointOfContactName: 'User Name 2',
        pointOfContactPhone: '0987654321',
        pointOfContactEmail: 'user2@example.com',
        address: 'New Delhi',
        district: 'District 2',
        cityVillageTown: 'Sample Town 2',
        state: 'State 2',
        pincode: '654321'
      }
    ];


    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(templateData);

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Branch Template');

    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="branch_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    return res.status(200).send(excelBuffer);
  } catch (err) {
    _handleCatchErrors(err, res);
  }
};

module.exports.branchList = async (req, res) => {
  try {
    const { limit = 10, skip = 0, paginate = 1, search = '', page = 1, fromAgent = false, state, scheme } = req.query;
    const { user_id, portalId } = req;

    // Adding search filter
    // let searchQuery = search ? {
    //   branchName: { $regex: search, $options: 'i' }        // Case-insensitive search for branchName
    // } : {};
    let searchQuery = {};
    if (search.trim()) {
      searchQuery.$or = [
        { branchName: { $regex: search, $options: 'i' } },
        { branchId: { $regex: search, $options: 'i' } }
      ]
    }

    if (state) {
      searchQuery.state = { $regex: `^${state}$`, $options: "i" };
    }
    let branchIdsForScheme = [];
    if (scheme) {
      const schemeData = await Scheme.findOne({ schemeName: scheme }).select('_id');
      if (schemeData) {
        const schemeId = schemeData._id;

        const schemeBranches = await SchemeAssign.find({ scheme_id: schemeId }).distinct('bo_id');
        branchIdsForScheme = schemeBranches;
        searchQuery._id = { $in: branchIdsForScheme };
      } else {
        searchQuery._id = { $in: [] };
      }
    }


    if (!fromAgent) {
      // searchQuery = { ...searchQuery, headOfficeId: req.user.portalId._id }
      searchQuery = { ...searchQuery, headOfficeId: portalId }
    } else {
      searchQuery = { ...searchQuery, headOfficeId: req.query.ho_id }
      // searchQuery = { ...searchQuery, headOfficeId: user_id }
    }

    // Count total documents for pagination purposes, applying search filter
    const totalCount = await Branches.countDocuments(searchQuery);

    // Determine the effective limit
    const effectiveLimit = Math.min(parseInt(limit), totalCount);

    // Fetch paginated branch data with search and sorting
    let branches = await Branches.find(searchQuery)
      .limit(effectiveLimit)    // Limit the number of documents returned
      .skip(parseInt(skip))      // Skip the first 'n' documents based on pagination
      .sort({ createdAt: -1 });  // Sort by createdAt in descending order by default

    // If paginate is set to 0, return all branches without paginating
    if (paginate == 0) {
      branches = await Branches.find(searchQuery).sort({ createdAt: -1 });
    }

    // Fetch the assigned scheme count for each branch and attach it to the branch object
    // const assignedSchemeCounts = await Promise.all(
    //   branches.map(async (branch) => {
    //     const count = await SchemeAssign.countDocuments({ bo_id: branch._id });
    //     return { ...branch.toObject(), assignedSchemeCount: count }; // Convert Mongoose document to plain object
    //   })
    // );
    const branchData = await Promise.all(
      branches.map(async (branch) => {
        const schemes = await SchemeAssign.find({ bo_id: branch._id })
          .populate("scheme_id", "schemeName")
          .lean();

        return {
          ...branch.toObject(),
          assignedSchemes: schemes.map(s => s.scheme_id?.schemeName).filter(Boolean),
          assignedSchemeCount: schemes.length
        };
      })
    );
    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalCount / limit);

    // Return the branches along with pagination info
    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: "Branches fetched successfully",
        data: {
          // branches: branches,
          // branches: assignedSchemeCounts,
          branches: branchData,
          totalCount: totalCount,
          totalPages: totalPages,
          limit: effectiveLimit,
          page: parseInt(page),
        },
      })
    );
  } catch (err) {
    return res.status(500).send(new serviceResponse({ status: 500, errors: [{ message: err.message }] }));
  }
};

module.exports.toggleBranchStatus = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branches.findById(branchId);

    if (!branch) {
      return res.status(404).send(new serviceResponse({
        status: 404,
        message: 'Branch not found'
      }));
    }

    // Toggle the status: if active, set to inactive; if inactive, set to active
    branch.status = branch.status === 'active' ? 'inactive' : 'active';

    await branch.save();

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        message: "Branch status updated successfully",
        data: branch
      })
    );
  } catch (err) {
    return res.status(500).send(new serviceResponse({
      status: 500,
      errors: [{ message: err.message }]
    }));
  }
};


module.exports.schemeList = async (req, res) => {
  const { bo_id, page = 1, limit = 10, skip = 0, paginate = 1, sortBy, search = '', isExport = 0 } = req.query;

  // Initialize matchQuery
  let matchQuery = { bo_id: new mongoose.Types.ObjectId(bo_id) };

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(bo_id)) {
    return res.status(400).json({ message: "Invalid item ID" });
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

    // Add schemeName field before filtering
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
      $addFields: {
        // schemeName: {
        //   $concat: [
        //     "$schemeDetails.schemeName",
        //     " ",
        //     { $ifNull: ["$schemeDetails.commodityDetails.name", ""] },
        //     " ",
        //     { $ifNull: ["$schemeDetails.season", ""] },
        //     " ",
        //     { $ifNull: ["$schemeDetails.period", ""] },
        //   ],
        // },
        schemeName: {
          $concat: [
            "$schemeDetails.schemeName",
            " ",
            { $ifNull: ["$commodityDetails.name", ""] }, // Fixed here
            " ",
            { $ifNull: ["$schemeDetails.season", ""] },
            " ",
            { $ifNull: ["$schemeDetails.period", ""] },
          ],
        },
        schemeId: { $ifNull: ["$schemeDetails.schemeId", ""] }
      },
    },

  ];

  if (search) {
    aggregationPipeline.push({
      $match: {
        $or: [
          { schemeId: { $regex: search, $options: "i" } },
          { schemeName: { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  aggregationPipeline.push(
    {
      $project: {
        _id: 1,
        schemeId: 1,
        schemeName: 1,
        scheme_id: 1,
        assignQty: 1,
        status: 1
      }
    }
  );

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
        "BO ID": item?.schemeName || "NA",
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
}

/*
module.exports.schemeAssign = asyncErrorHandler(async (req, res) => {
  try {
    const { schemeData, bo_id } = req.body;
    const { user_id } = req;
    // Validate input
    if (!bo_id || !Array.isArray(schemeData) || schemeData.length === 0) {
      return res.status(400).send(new serviceResponse({
        status: 400,
        message: "Invalid request. 'bo_id' and 'schemeData' must be provided.",
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
      const existingRecord = await SchemeAssign.findOne({ bo_id, scheme_id: _id });

      if (existingRecord) {
        // Update existing record
        existingRecord.assignQty = qty;
        await existingRecord.save();
        updatedRecords.push(existingRecord);
      } else {
        // Prepare new record for insertion
        newRecords.push({
          bo_id,
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
*/

module.exports.schemeAssign = asyncErrorHandler(async (req, res) => {
  try {
    const { schemeData, bo_id } = req.body;

    // Validate input
    if (!bo_id || !Array.isArray(schemeData) || schemeData.length === 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: "Invalid request. 'bo_id' and 'schemeData' must be provided.",
        })
      );
    }

    let updatedRecords = [];
    let newRecords = [];

    for (const { _id, qty } of schemeData) {
      // Find the SchemeAssign record using `_id`
      const schemeAssignRecord = await SchemeAssign.findById(_id);
      if (!schemeAssignRecord) {
        return res.status(404).send(
          new serviceResponse({
            status: 404,
            message: `SchemeAssign record with ID ${_id} not found.`,
          })
        );
      }

      // Check if a record already exists for the given `bo_id` and `scheme_id`
      const existingRecord = await SchemeAssign.findOne({
        scheme_id: schemeAssignRecord.scheme_id, // Get scheme_id from the found record
        bo_id: new mongoose.Types.ObjectId(bo_id),
      });

      if (existingRecord) {
        // Update existing record
        existingRecord.assignQty = Number(existingRecord.assignQty) + Number(qty);
        await existingRecord.save();
        updatedRecords.push(existingRecord);
      } else {
        // Insert new record with the correct scheme_id
        newRecords.push({
          bo_id,
          scheme_id: schemeAssignRecord.scheme_id, // Correctly fetch scheme_id from existing SchemeAssign
          assignQty: qty,
        });
      }
    }

    // Bulk insert new records if any
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

