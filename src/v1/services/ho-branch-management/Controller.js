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




module.exports.importBranches = async (req, res) => {
    try {
      const { email } = req;

      // Query HeadOffice collection to find the headOfficeId by email
      const headOffice = await HeadOffice.findOne({ email });
  
      if (!headOffice) {
        return res.status(403).json({
          message: "HeadOffice not found for this email",
          status: 403,
        });
      }
  
      const headOfficeId = headOffice._id;
  
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
          pointOfContact: row.pointOfContact,
          address: row.address,
          status: false, 
          headOfficeId: headOfficeId, 
        };
      });

      // Insert the branches into the database
      await Branches.insertMany(branches);

       // Send an email to each branch email address notifying them that the branch has been created
       for (const branch of branches) {
            const subject = 'Branch Created Successfully';
            const body = `<p>Dear ${branch.pointOfContact},</p>
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
        pointOfContact: branch.pointOfContact,
        status: branch.status ? 'Active' : 'Inactive',
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