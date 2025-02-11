const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

module.exports.createSLA = async (req, res) => {
    try {
        const data = req.body;

        // Required fields validation
        const requiredFields = [
            "basic_details.name",
            "basic_details.email",
            "basic_details.mobile",
            "company_owner_information.owner_name",
            "company_owner_information.mobile",
            "company_owner_information.email",
            "company_owner_information.aadhar_number",
            "company_owner_information.pan_card",
            "point_of_contact.name",
            "point_of_contact.designation",
            "point_of_contact.mobile",
            "point_of_contact.email",
            "point_of_contact.aadhar_number",
            "address.line1",
            "address.pinCode",
            "address.state",
            "address.district",
            "address.city",
            "address.country",
            "operational_address.line1",
            "operational_address.pinCode",
            "operational_address.state",
            "operational_address.district",
            "operational_address.city",
            "operational_address.country",
            "company_details.registration_number",
            "company_details.cin_image",
            "company_details.pan_card",
            "company_details.pan_image",
            "authorised.name",
            "authorised.designation",
            "authorised.email",
            "authorised.aadhar_number",
            "authorised.aadhar_certificate.front",
            "authorised.aadhar_certificate.back",
            "bank_details.bank_name",
            "bank_details.branch_name",
            "bank_details.ifsc_code",
            "bank_details.account_number",
            "bank_details.proof",
            "sla_id"
        ];

        const missingFields = requiredFields.filter(field => {
            const keys = field.split(".");
            let value = data;
            for (let key of keys) {
                if (value[key] === undefined || value[key] === null || value[key] === "") {
                    return true;
                }
                value = value[key];
            }
            return false;
        });

        if (missingFields.length > 0) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                message: `Missing required fields: ${missingFields.join(", ")}`,
                data: null
            }));
        }

        // Create SLA document
        const sla = await SLAManagement.create(data);

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: sla,
            message: _response_message.created("SLA")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.getSLAList = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sortBy = 'createdAt', isExport = 0 } = req.body;

        // Convert page & limit to numbers
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        // Define search filter (if search is provided)
        const searchFilter = search
            ? {
                  $or: [
                      { "basic_details.name": { $regex: search, $options: "i" } },
                      { "basic_details.email": { $regex: search, $options: "i" } },
                      { "basic_details.mobile": { $regex: search, $options: "i" } }
                  ]
              }
            : {};

        // Sorting logic (default is createdAt descending)
        const sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = -1; // Sort by given field in descending order
        }

        // Fetch SLA records
        let slaRecords;
        if (isExport === 1) {
            // If exporting, return all data without pagination
            slaRecords = await SLAManagement.find(searchFilter).sort(sortOptions);
        } else {
            slaRecords = await SLAManagement.find(searchFilter)
                .sort(sortOptions)
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize);
        }

        // Count total records for pagination
        const totalRecords = await SLAManagement.countDocuments(searchFilter);

        return res.status(200).json({
            status: 200,
            data: slaRecords,
            totalRecords,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalRecords / pageSize),
            message: "SLA records fetched successfully"
        });

    } catch (error) {
        console.error("Error fetching SLA records:", error);
        return res.status(500).json({
            status: 500,
            error: "Internal Server Error"
        });
    }
};