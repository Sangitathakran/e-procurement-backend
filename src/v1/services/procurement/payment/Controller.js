const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _sellerOfferStatus, _procuredStatus, _associateOrderStatus, _user_status } = require('@src/v1/utils/constants');
const { Payment } = require("@src/v1/models/app/procurement/Payment");


module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id } = req.query

        let query = {
            req_id,
            ...(search ? { name: { $regex: search, $options: "i" } } : {})
        };
        const records = { count: 0 };
        records.rows = paginate == 1 ? await Payment.find(query)
            .populate({
                path: 'req_id', select: 'product address'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await Payment.find(query).sort(sortBy);

        records.count = await Payment.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
