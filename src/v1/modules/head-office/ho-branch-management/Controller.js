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
            const subject = 'Branch Created Successfully';
            const body = `<p>Dear ${branch.pointOfContact.name},</p>
                      <p>Your branch (${branch.branchName}) has been successfully created in our system.</p>
                      <p>Regards,<br/>Radiant Team</p>`;
  
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
      const { limit, skip, sortBy, paginate } = req.query;
  
      // Count total number of branches (for pagination purposes)
      const totalCount = await Branches.countDocuments();
  
      // Fetch paginated branch data
      let branches = await Branches.find()
        .limit(limit)    // Limit the number of documents returned
        .skip(skip)      // Skip the first 'n' documents based on pagination
        .sort(sortBy);   // Sort the documents based on the field specified in the request
  
      // If paginate is set to 0, return all branches without paginating
      if (paginate == 0) {
        branches = await Branches.find();
      }
  
      // Return the branches along with pagination info
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          message: "Branches fetched successfully",
          data: {
            branches: branches,
            totalCount: totalCount,
            limit: parseInt(limit),
            page: parseInt(req.query.page)
          },
        })
      );
    } catch (err) {
      return res.send(new serviceResponse({ status: 500, errors: [{ message: err.message }] }));
    }
  };