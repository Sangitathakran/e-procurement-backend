const mongoose = require('mongoose');
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { Distiller } = require("@src/v1/models/app/auth/Distiller");
const { User } = require("@src/v1/models/app/auth/User");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");

module.exports.getDistiller = async (req, res) => {
    try {
        // Extract query parameters with defaults
        const {
          page = 1,
          limit = 10,
          sortBy = "createdAt",
          order = "desc",
          search = "",
          paginate = 1,
          isExport = 0,
        } = req.query;
    
        const skip = (page - 1) * limit;
    
        // Build the query
        const query = {
          deletedAt: null,
          ...(search && { "basic_details.distiller_details.organization_name": { $regex: search, $options: "i" } }),
        };
    
        // Determine the sort order
        const sortOrder = order === "desc" ? -1 : 1;
    
        // Fetch data
        let rows;
        if (paginate == 1) {
          rows = await Distiller.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        } else {
          rows = await Distiller.find(query).sort({ [sortBy]: sortOrder });
        }
    
        // Count total documents
        const count = await Distiller.countDocuments(query);
    
        // Prepare response
        const records = {
          rows,
          count,
        };
    
        if (paginate == 1) {
          records.page = parseInt(page);
          records.limit = parseInt(limit);
          records.pages = limit != 0 ? Math.ceil(count / limit) : 0;
        }
    
        // Handle export logic (if needed)
        if (isExport == 1) {
          // Placeholder for export functionality
          // You can implement file export logic here if required
        }
    
        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Distiller") }));
      } catch (error) {
        console.error("Error fetching distillers:", error);
        _handleCatchErrors(error, res);
      }
    };