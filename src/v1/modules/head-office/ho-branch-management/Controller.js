const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
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



module.exports.importBranches = async (req, res) => {
  try {
    const headOfficeId = req.user.portalId._id;
    if (!headOfficeId) {
      return res.status(403).json({
        message: "HeadOffice not found",
        status: 403,
      });
    }


    // Check if the file is provided via the global multer setup
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .send(
          new serviceResponse({
            status: 400,
            message: _response_message.fileMissing,
          })
        );
    }

    // Access the uploaded file
    const uploadedFile = req.files[0]; 


    // Read the Excel file using xlsx
    const workbook = xlsx.read(uploadedFile.buffer, { type: 'buffer' });
    const sheet_name_list = workbook.SheetNames;
    const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]); // Convert first sheet to JSON
    console.log('excelData length-->', excelData)
    // Expected headers
    const expectedHeaders = [
      'branchName', 'emailAddress', 'pointOfContactName', 'pointOfContactPhone', 'pointOfContactEmail', 
      'address', 'district', 'cityVillageTown', 'state', 'pincode'
    ];
    
    // Validate headers
    const fileHeaders = Object.keys(excelData[0] || {});
    const missingHeaders = expectedHeaders.filter(header => !fileHeaders.includes(header));

    if (missingHeaders.length > 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: `Missing required headers: ${missingHeaders.join(', ')}`,
        })
      );
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
        state: row.state,
        district:row.district,
        pincode: row.pincode,
        status: _status.inactive,
        headOfficeId: headOfficeId,
        password: password,
        hashedPassword:hashedPassword,
      }; 
    }));

    //this is to get the type object of head office  
    const type = await TypesModel.findOne({_id:"67110087f1cae6b6aadc2421"})
  
    

    // Insert the branches into the database
    for (const branchData of branches) {
      // checking the existing user in Master User collectio

      const isUserAlreadyExist = await MasterUser.findOne({ $or: [{mobile:branchData.pointOfContact.phone.toString().trim()},{email:branchData.pointOfContact.email.trim()}]})
      if(isUserAlreadyExist){
        throw new Error("user already existed with this mobile number or email in Master")
      }
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
        district:branchData.district,
        state: branchData.state,
        pincode: branchData.pincode,
        headOfficeId: headOfficeId,
        password: branchData.hashedPassword,
      }
      const branch = new Branches(newBranchPayload);
      const newBranch = await branch.save();
      
      
      if(newBranch._id){
        const masterUser = new MasterUser({
          firstName : branchData.pointOfContact.name,
          isAdmin : true,
          email : branchData.pointOfContact.email.trim(),
          mobile : branchData.pointOfContact.phone.toString().trim(),
          password: branchData.hashedPassword,
          user_type : type.user_type,
          createdBy: req.user._id,
          userRole: [type.adminUserRoleId],
          portalId: newBranch._id,
          ipAddress:getIpAddress(req)
        });
  
        await masterUser.save();
      }else{
        await Branches.deleteOne({_id:newBranch._id})
        throw new Error("branch office not created")
      }
    }

     // Send an email to each branch email address notifying them that the branch has been created
     const login_url = `${process.env.FRONTEND_URL}${_frontendLoginRoutes.bo}`

     for (const branchData of branches) {
          const emailPayload = {
            email: branchData.pointOfContact.email,
            name: branchData.pointOfContact.name,
            password: branchData.password,
            login_url:login_url
        }
        await emailService.sendBoCredentialsEmail(emailPayload);

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

  
  

  module.exports.exportBranches = async (req, res) => {
    try {
      const branches = await Branches.find({}, 'branchId branchName emailAddress pointOfContact address district cityVillageTown state pincode status createdAt');
  
      // Format the data to be exported
      const branchData = branches.map((branch) => ({
        id: branch._id.toString(), 
        branchId: branch.branchId,
        name: branch.branchName,
        email: branch.emailAddress,
        address: branch.address,
        district: branch.district,
        cityVillageTown: branch.cityVillageTown, 
        state: branch.state,                     
        pincode: branch.pincode, 
        pointOfContactName: branch.pointOfContact.name,
        pointOfContactPhone: branch.pointOfContact.phone,
        pointOfContactEmail: branch.pointOfContact.email,
        status: branch.status || _status.inactive,
        createdAt: new Date(branch.createdAt).toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
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
      const { limit = 10, skip = 0 , paginate = 1, search = '', page = 1 } = req.query;
  
      // Adding search filter
      let searchQuery = search ? {
        branchName: { $regex: search, $options: 'i' }        // Case-insensitive search for branchName
       } : {};

      searchQuery = {...searchQuery , headOfficeId: req.user.portalId._id }
  
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
  
      // Calculate total pages for pagination
      const totalPages = Math.ceil(totalCount / limit);
  
      // Return the branches along with pagination info
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: "Branches fetched successfully",
          data: {
            branches: branches,
            totalCount: totalCount,
            totalPages: totalPages,
            limit: effectiveLimit,
            page: parseInt(page)
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
    console.log({branch})

    
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