const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _response_message,
  _middleware,
  _auth_module,
} = require("@src/v1/utils/constants/messages");

const Branches = require("@src/v1/models/master/Branches");
const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");

const xlsx = require("xlsx");
const { sendMail } = require("@src/v1/utils/helpers/node_mailer"); 
const { _status } = require("@src/v1/utils/constants");




module.exports.importBranches = async (req, res) => {
    try {
      const { _id } = req;
 
      const headOfficeId = _id;
  
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
            serviceResponse({
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
  
      // Expected headers
      const expectedHeaders = ['branchName', 'emailAddress', 'pointOfContactName', 'pointOfContactPhone', 'pointOfContactEmail', 'address'];

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

      // Email regex for validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

      // Validate each row
      for (const [index, row] of excelData.entries()) {
        // Check for empty fields
        for (const field of expectedHeaders) {
          if (!row[field]) {
            return res.status(400).send(
              new serviceResponse({
                status: 400,
                message: `Row ${index + 1}: The field "${field}" is required and cannot be empty.`,
              })
            );
          }
        }

        // Phone number length validation
        if (row.pointOfContactPhone && row.pointOfContactPhone.toString().length !== 10) {
          return res.status(400).send(
            new serviceResponse({
              status: 400,
              message: `Row ${index + 1}: The phone number must be exactly 10 digits.`,
            })
          );
        }

        // Validate email format for emailAddress
        if (!emailRegex.test(row.emailAddress)) {
          return res.status(400).send(
            new serviceResponse({
              status: 400,
              message: `Row ${index + 1}: The email address "${row.emailAddress}" is invalid.`,
            })
          );
        }

        // Validate email format for pointOfContactEmail
        if (!emailRegex.test(row.pointOfContactEmail)) {
          return res.status(400).send(
            new serviceResponse({
              status: 400,
              message: `Row ${index + 1}: The point of contact email "${row.pointOfContactEmail}" is invalid.`,
            })
          );
        }
      }

      // Parse the rows into Branch objects, with status set to false by default
      const branches = excelData.map((row) => {
        return {
          branchName: row.branchName,
          emailAddress: row.emailAddress,
          pointOfContact: {
            name: row.pointOfContactName,
            phone: row.pointOfContactPhone,
            email: row.pointOfContactEmail
          },
          address: row.address,
          status: _status.inactive, 
          headOfficeId: headOfficeId, 
        };
      });

      // Insert the branches into the database
      await Branches.insertMany(branches);

       // Send an email to each branch email address notifying them that the branch has been created
       for (const branch of branches) {
            const subject = 'Welcome to NCCF E-Procurement Portal👋';
            const body = `<p>Dear ${branch.pointOfContact.name},</p>
                      <p>You are invited to join NCCF E-Procurement Portal! For login, You need to reset the temporary password. Please click the button given below to create your new account password.</p>
                      <strong>(CHANGE PASSWORD)</strong><br/>
                      <p>Email Id: </p>
                      <p>Temporary Password: </p>
                      <p>Link: </p>
                      <p>Thank you,<br/>NCCF E-Procurement Team</p>`;
  
        // Use the helper function to send the email
        await sendMail(branch.emailAddress, null, subject, body);
      }
  
      return res
      .status(200)
      .send(
        new serviceResponse({
          status: 200,
          message: _response_message.importSuccess(),
        })
      );
    } catch (err) {
      _handleCatchErrors(err, res);
    }
  };
  
  

  module.exports.exportBranches = async (req, res) => {
    try {
      const branches = await Branches.find({}, 'branchName emailAddress pointOfContact address status createdAt');
  
      // Format the data to be exported
      const branchData = branches.map((branch) => ({
        id: branch._id.toString(), 
        name: branch.branchName,
        email: branch.emailAddress,
        address: branch.address,
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
          address: 'Noida'
        },
        {
          branchName: 'Example Branch 2',
          emailAddress: 'example2@domain.com',
          pointOfContactName: 'User Name 2',
          pointOfContactPhone: '0987654321',
          pointOfContactEmail: 'user2@example.com',
          address: 'New Delhi'
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
      const searchQuery = {
        $or: [
          { batchName: { $regex: search, $options: 'i' } },        // Case-insensitive search for batchName
          { emailAddress: { $regex: search, $options: 'i' } },     // Case-insensitive search for emailAddress
          { 'pointOfContact.name': { $regex: search, $options: 'i' } }, // Case-insensitive search for pointOfContactName
          { 'pointOfContact.email': { $regex: search, $options: 'i' } }  // Case-insensitive search for pointOfContactEmail
        ]
      };
  
      // Count total documents for pagination purposes, applying search filter
      const totalCount = await Branches.countDocuments(searchQuery);
  
      // Fetch paginated branch data with search and sorting
      let branches = await Branches.find(searchQuery)
        .limit(parseInt(limit))    // Limit the number of documents returned
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
            limit: parseInt(limit),
            page: parseInt(page)
          },
        })
      );
    } catch (err) {
      return res.send(serviceResponse({ status: 500, errors: [{ message: err.message }] }));
    }
  };
  
  
module.exports.toggleBranchStatus = async (req, res) => {
  try {
    const { branchId } = req.params; 

    const branch = await Branches.findById(branchId);
    console.log({branch})

    
    if (!branch) {
      return res.status(404).send(serviceResponse({ 
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
    return res.status(500).send(serviceResponse({
      status: 500,
      errors: [{ message: err.message }]
    }));
  }
};