const SLAManagement = require("@src/v1/models/app/auth/SLAManagement");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");

module.exports.createSLA = asyncErrorHandler(async (req, res) => {
    try {
        const data = {
            ...req.body,
            schemes: {
                branch: req.user._id
            }
        };
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
            // "address.country",
            "operational_address.line1",
            "operational_address.pinCode",
            "operational_address.state",
            "operational_address.district",
            "operational_address.city",
            // "operational_address.country",
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
            // "slaId",
            // "schemes.scheme",
            // "schemes.cna",
            "schemes.branch"
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
});

module.exports.getSLAList = asyncErrorHandler(async (req, res) => {

    try {
        const { page = 1, limit = 10, search = '', sortBy = 'createdAt', isExport = 0 } = req.query;
        const userID = req.user._id

        // Convert page & limit to numbers
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        // Define search filter (if search is provided)
        const searchFilter = search ? {
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

        // Fetch SLA records with projection
        let slaRecordsQuery = SLAManagement.aggregate([
            {
                $match: {
                    ...searchFilter,
                    "schemes.branch": userID
                }
            },
            {
                $project: {
                    _id: 1,
                    slaId: 1,
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
            },
            { $sort: sortOptions }
        ]);

        // If exporting, return all data
        if (isExport === 1) {
            const slaRecords = await slaRecordsQuery;
            return res.status(200).json({
                status: 200,
                data: slaRecords,
                message: "SLA records exported successfully"
            });
        }

        // Pagination
        const slaRecords = await slaRecordsQuery
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        // Count total records for pagination
        const totalRecords = await SLAManagement.countDocuments({
            ...searchFilter,
            "schemes.branch": userID
        });

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
});

module.exports.deleteSLA = asyncErrorHandler(async (req, res) => {
    try {
        const { slaId } = req.params; // Get SLA ID from URL params
        const userID = req.user._id

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        // Find and delete SLA by slaId or _id
        const deletedSLA = await SLAManagement.findOneAndDelete({ $or: [{ slaId }, { _id: slaId }], "schemes.branch": userID });

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
        const userID = req.user._i

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        // Find and update SLA
        const updatedSLA = await SLAManagement.findOneAndUpdate(
            { $or: [{ slaId }, { _id: slaId }], "schemes.branch": userID },
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
        const userID = req.user._id

        if (!slaId) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "SLA ID is required"
            }));
        }

        // Find SLA with selected fields
        const sla = await SLAManagement.findOne(
            { $or: [{ slaId }, { _id: slaId }], "schemes.branch": userID },
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
        const userID = req.user._id

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
            { $or: [{ slaId }, { _id: slaId }], "schemes.branch": userID },
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
        const userID = req.user._id

        // Validate input
        if (!scheme || !cna || !branch) {
            return res.status(400).json(new serviceResponse({
                status: 400,
                message: "Missing required fields: scheme, cna, branch"
            }));
        }

        // Find SLA and update with new scheme
        const updatedSLA = await SLAManagement.findOneAndUpdate(
            { $or: [{ slaId }, { _id: slaId }], "schemes.branch": userID },
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