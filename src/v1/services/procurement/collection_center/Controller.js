const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {  _response_message } = require("@src/v1/utils/constants/messages");
const { CollectionCenter } = require("@src/v1/models/app/procurement/CollectionCenter");

module.exports.createCollectionCenter = async (req, res) => {

    try {
        const { user_id, user_type, trader_type } = req
        const { agencyId, line1, line2, country, state, district, city, name, email, mobile, designation,aadhar_number, aadhar_image, postalCode, lat, long, addressType } = req.body;

        const record = await CollectionCenter.create({
            agencyId,
            user_id:user_id,
            address: { line1, line2, country, state, district, city, postalCode, lat, long },
            point_of_contact: { name, email, mobile, designation, aadhar_number, aadhar_image, },
            addressType
        });

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("Collection Center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}

module.exports.getCollectionCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        const { user_id } = req
        let query = {
            user_id: user_id,
            ...(search ? { name: { $regex: search, $options: "i" } ,deletedAt: null} : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await CollectionCenter.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await CollectionCenter.find(query).sort(sortBy);

        records.count = await CollectionCenter.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getHoProcurementCenter = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query
        //const { user_id } = req
        let query = {
            //user_id: user_id,
            ...(search ? { center_name: { $regex: search, $options: "i" } ,deletedAt: null} : { deletedAt: null })
        };
        console.log("query==>",query)
        const records = { count: 0 };
        records.rows = paginate == 1 ? await CollectionCenter.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await CollectionCenter.find(query).sort(sortBy);

        records.count = await CollectionCenter.countDocuments(query);

        if (paginate == 1) {
            records.page = page 
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("collection center") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
