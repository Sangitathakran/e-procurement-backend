const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { SellerOffers } = require("@src/v1/models/app/procurement/SellerOffers");
const { ContributedFarmers } = require("@src/v1/models/app/procurement/ContributedFarmer");
const { _sellerOfferStatus } = require('@src/v1/utils/constants');
const { AssociateOrders } = require("@src/v1/models/app/procurement/AssociateOrders");



module.exports.associateOrder = async (req, res) => {

    try {

        const { req_id } = req.body;
        const { user_id } = req;

        const record = await SellerOffers.findOne({ seller_id: user_id, req_id: req_id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
        }

        const farmerRecords = await ContributedFarmers.findOne({ status: { $ne: _procuredStatus.received }, sellerOffers_id: record?._id });

        if (farmerRecords) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));
        }

        const receivedRecords = await ContributedFarmers.find({ status: _procuredStatus.received, sellerOffers_id: record?._id });


        if (receivedRecords.length == 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound() }] }));
        }

        const myMap = new Map();
        receivedRecords.forEach((ele) => {

            if (myMap.has(ele.procurementCenter_id)) {
                const currElement = myMap.get(ele.procurementCenter_id);
                currElement.dispatchedqty += ele.qtyProcured;
            } else {
                myMap.set(ele.procurementCenter_id, { seller_id: user_id, sellerOffer_id: record._id, dispatchedqty: ele.qtyProcured });
            }
        })

        const associateRecords = await AssociateOrders.insertMany([...myMap.values()]);

        record.status = _sellerOfferStatus.ordered;
        await record.save();

        return res.status(200).send(new serviceResponse({ status: 200, data: associateRecords, message: _response_message.created("order") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.editTrackDelivery = async (req, res) => {

    try {

        const { id, material_img, weight_slip, qc_report, lab_report } = req.body;

        const record = await AssociateOrders.findOne({ _id: id });

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("order") }] }))
        }

        record.dispatched.material_img = material_img;
        record.dispatched.weight_slip = weight_slip;
        record.dispatched.qc_report = qc_report;
        record.dispatched.lab_report = lab_report;

        await record.save();
        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("order") }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
