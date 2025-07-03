
const { User } = require("@src/v1/models/app/auth/User");

const { _userType, _userStatus } = require("@src/v1/utils/constants");
const { _response_message, _middleware, _query } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { serviceResponse, sendResponse } = require("@src/v1/utils/helpers/api_response");



module.exports.getAssociates = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', sortBy, isExport = 0 } = req.query;
        const skip = (page - 1) * limit;

        // Build the query for searching/filtering associates
        let matchQuery = {
            user_type: _userType.associate,
            is_approved: _userStatus.approved,
            // bank_details: { $ne: null }
        };

        // If there's a search term, add it to the match query
        if (search) {
            matchQuery['basic_details.associate_details.associate_name'] = { $regex: search, $options: 'i' };
        }

        // Aggregation pipeline to join farmers and procurement centers and get counts
        const records = await User.aggregate([
            { $match: matchQuery },
            { $sort: sortBy }, // Sort by the provided field
            { $skip: skip }, 
            { $limit: parseInt(limit) }, 

            // Lookup to count associated farmers
            {
                $lookup: {
                    from: 'farmers', // Collection name for farmers
                    localField: '_id',
                    foreignField: 'associate_id',
                    as: 'farmers'
                }
            },
            {
                $addFields: {
                    farmersCount: { $size: '$farmers' } // Get the count of farmers
                }
            },
            // Lookup to count associated procurement centers
            {
                $lookup: {
                    from: 'procurementcenters', // Collection name for procurement centers
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'procurementCenters'
                }
            },
            {
                $addFields: {
                    procurementCentersCount: { $size: '$procurementCenters' } // Get the count of procurement centers
                }
            },
            {
                $project: {
                    farmers: 0,
                    procurementCenters: 0 // Exclude the procurement centers array
                }
            }
        ]);
        // Get total count of documents for pagination purposes
        const totalRecords = await User.countDocuments(matchQuery);
        // Pagination information
        const totalPages = Math.ceil(totalRecords / limit);


        if (isExport == 1) {
            const record = records.map((item) => {
                const { name, email, mobile } = item?.basic_details.point_of_contact;

                const { line1, line2, district, state, country } = item.address.registered

                return {
                    "Associate Id": item?.user_code || "NA",
                    "Associate Name": item?.basic_details.associate_details.associate_name || "NA",
                    "Associate Type": item?.basic_details.associate_details.associate_type || "NA",

                    "Associated Farmer": item?.farmersCount || "NA",
                    "Procurement Center": item?.procurementCentersCount || "NA",
                    "Point Of Contact": `${name} , ${email} , ${mobile}` || "NA",
                    "Address": `${line1} , ${line2} , ${district} , ${state} , ${country}` || "NA",
                    "Status": item?.active || "NA",
                }
            })

            if (record.length > 0) {
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `Associate-${'Associate'}.xlsx`,
                    worksheetName: `Associate-record-${'Associate'}`
                });
            } else {
                return res.status(400).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Associate") }))
            }
        }
        else {

            return res.status(200).send(new serviceResponse({
                status: 200,
                data: {
                    rows: records,
                    count: totalRecords,
                    page: page,
                    limit: limit,
                    pages: totalPages
                },
                message: _response_message.found("associates")
            }));
        }
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};








