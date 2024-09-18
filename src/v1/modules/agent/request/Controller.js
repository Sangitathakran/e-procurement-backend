const { _generateOrderNumber, _addDays } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { _webSocketEvents } = require('@src/v1/utils/constants');
const { _userType } = require('@src/v1/utils/constants');
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");

module.exports.createProcurement = asyncErrorHandler(async (req, res) => {
    const { user_id, user_type } = req
    const { organization_id, quotedPrice, deliveryDate, name, commodityImage, grade, variety, quantity, deliveryLocation, lat, long, quoteExpiry, head_office_id, branch_id, expectedProcurementDate } = req.body;

    if (user_type && user_type != _userType.agent)
        return res.send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized() }] }))

    const randomVal = _generateOrderNumber();

    const quote_expiry_date = _addDays(quoteExpiry);
    const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

    if (moment(delivery_date).isBefore(quote_expiry_date)) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid_delivery_date("Delivery date") }] }))
    }

    const record = await RequestModel.create({
        organization_id,
        head_office_id,
        branch_id,
        reqNo: randomVal,
        expectedProcurementDate,
        quotedPrice, deliveryDate: delivery_date,
        product: { name, commodityImage, grade, variety, quantity },
        address: { deliveryLocation, lat, long },
        quoteExpiry: _addDays(quoteExpiry),
        createdBy: user_id
    });

    eventEmitter.emit(_webSocketEvents.procurement, { ...record, method: "created" })
    return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("procurement") }));
})


module.exports.approveRejectOfferByAgent = asyncErrorHandler(async (req, res) => {


    const { user_type, user_id } = req;

    // if (user_type != _userType.admin) {
    //     return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] })))
    // }

    const { associateOffer_id, status, comment } = req.body;

    const offer = await AssociateOffers.findOne({ _id: associateOffer_id });

    if (!offer) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }))
    }

    if (!Object.values(_sellerOfferStatus).includes(status)) {
        return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.invalid("status") }] }))
    }

    if (status == _associateOfferStatus.rejected && comment) {
        offer.comments.push({ user_id: user_id, comment });
    }

    offer.status = status;
    await offer.save();

    return res.status(200).send(new serviceResponse({ status: 200, data: offer, message: _response_message.found("offer") }))

})