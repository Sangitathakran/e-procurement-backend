const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { farmerOrderList } = require("../../associate/request/Controller");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");

module.exports.batchNorthEastBulkuplod = async (req, res) => {
    const req_id = "67c998d7fcf73bf553b62703";
    try {
        const offer = await AssociateOffers.findOne({ req_id });
        if (!offer) {
            return res.status(404).send(new serviceResponse({ status: 404, message: "Offer not found" }));
        }

        let query = {
            associateOffers_id: { $in: [offer._id] }, // Use the correct ObjectId
            status: "Received", // Correcting the misplaced condition
            qtyRemaining: { $gt: 0 }
        };

        const farmerOrder = await FarmerOrders.find(query, { _id: 1 });

// -----------------------------Batch Create--------------------------------------------------------
const {  truck_capacity, farmerData = [] } = req.body;
// const { user_id } = req;

//  procurement Request exist or not 
const procurementRecord = await RequestModel.findOne({ _id: req_id });
if (!procurementRecord) {
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("request") }] }))
}

const record = await AssociateOffers.findOne({ seller_id: user_id, req_id: req_id });
if (!record) {
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("offer") }] }));
}

const sumOfQty = farmerData.reduce((acc, curr) => {
    acc = acc + curr.qty;
    return acc;
}, 0);

// Apply handleDecimal to sumOfQty and truck_capacity if neededs
const sumOfQtyDecimal = handleDecimal(sumOfQty);
const truckCapacityDecimal = handleDecimal(truck_capacity);

if (sumOfQtyDecimal > truckCapacityDecimal) {
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "quantity should not exceed truck capacity" }] }))
}

//////////////// Start of Sangita code

if (sumOfQtyDecimal > record.offeredQty) {
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Quantity should not exceed offered Qty." }] }))
}

const existBatch = await Batch.find({ seller_id: user_id, req_id, associateOffer_id: record._id });
if (existBatch) {
    const addedQty = existBatch.reduce((sum, existBatch) => sum + existBatch.qty, 0);

    if (addedQty >= record.offeredQty) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Cannot create more Batch, Offered qty already fulfilled." }] }))
    }
}

//////////////// End of Sangita code

const farmerOrderIds = [];
let partiallyFulfilled = 0;
let procurementCenter_id;

for (let farmer of farmerData) {

    const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

    // farmer order exist or not 
    if (!farmerOrder) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("farmer order") }] }));
    }

    // order should be procured from these farmers 
    if (farmerOrder.status != _procuredStatus.received) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "farmer order should not be pending" }] }));
    }

    // procurement Center should be same in current batch
    if (!procurementCenter_id) {
        procurementCenter_id = farmerOrder?.procurementCenter_id.toString();
    } else if (procurementCenter_id && procurementCenter_id != farmerOrder.procurementCenter_id.toString()) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "procurement center should be the same for all the orders" }] }))
    }

    // qty should not exceed from qty procured 
    if (farmerOrder?.qtyProcured < farmer.qty) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "added quantity should not exceed quantity procured" }] }));
    }
    // is the order full filled partially 
    if ((farmerOrder?.qtyProcured - farmer.qty) > 0) {
        partiallyFulfilled = 1;
    }

    // Apply handleDecimal to amt for each farmer
    farmer.amt = handleDecimal(farmer.qty * procurementRecord?.quotedPrice);
    farmerOrderIds.push(farmer.farmerOrder_id);
}

// given farmer's order should be in received state
const farmerRecords = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $in: farmerOrderIds } });
if (farmerRecords)
    return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.pending("contribution") }] }));

// update status based on fulfillment 
const farmerRecordsPending = await FarmerOrders.findOne({ status: { $ne: _procuredStatus.received }, associateOffers_id: record?._id, _id: { $nin: farmerOrderIds } });
record.status = (farmerRecordsPending || partiallyFulfilled == 1) ? _associateOfferStatus.partially_ordered : _associateOfferStatus.ordered;

// create unique batch Number 
let batchId, isUnique = false;
while (!isUnique) {
    batchId = await generateBatchId();
    if (!(await Batch.findOne({ batchId: batchId }))) isUnique = true;
}

const findwarehouseUser = await RequestModel.findOne({ _id: req_id });

const qty_value = handleDecimal(sumOfQtyDecimal);

const batchCreated = await Batch.create({
    seller_id: user_id,
    req_id,
    associateOffer_id: record._id,
    batchId,
    warehousedetails_id: findwarehouseUser.warehouse_id,
    farmerOrderIds: farmerData,
    procurementCenter_id,
    qty: qty_value,  // Apply handleDecimal here
    available_qty: qty_value,
    goodsPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice), // Apply handleDecimal here
    totalPrice: handleDecimal(sumOfQtyDecimal * procurementRecord?.quotedPrice) // Apply handleDecimal here
});

for (let farmer of farmerData) {
    const farmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).lean();

    // Fetch the latest qtyRemaining from the database
    const latestFarmerOrder = await FarmerOrders.findOne({ _id: farmer.farmerOrder_id }).select('qtyRemaining qtyProcured').lean();

    if (!latestFarmerOrder) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Farmer order not found." }] }));
    }

    const currentRemaining = latestFarmerOrder.qtyRemaining ?? latestFarmerOrder.qtyProcured;

    // Validate remaining quantity
    if (currentRemaining < farmer.qty) {
        return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: "Added quantity exceeds the remaining quantity." }] }));
    }

    // Update the quantity remaining
    await FarmerOrders.updateOne(
        { _id: farmer.farmerOrder_id },
        { $set: { qtyRemaining: handleDecimal(currentRemaining - farmer.qty) } }
    );
}


procurementRecord.associatOrder_id.push(record._id);
await record.save();
await procurementRecord.save();

// const users = await User.find({
//     'basic_details.associate_details.email': { $exists: true }
// }).select('basic_details.associate_details.email basic_details.associate_details.associate_name associate.basic_details.associate_details.organization_name');

// await Promise.all(
//     users.map(({ basic_details: { associate_details } }) => {
//         const { email, associate_name } = associate_details;

//         return emailService.sendCreateBatchEmail(email, associate_name);
//     })
// );

return res.status(200).send(new serviceResponse({ status: 200, data: batchCreated, message: _response_message.created("batch") }))

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: farmerOrder,
            message: _response_message.found()
        }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};
