const { _handleCatchErrors, dumpJSONToExcel, generateFileName } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { Payment } = require("@src/v1/models/app/procurement/Payment");
const { _userType, _paymentstatus, _batchStatus, _associateOfferStatus, _paymentApproval, received_qc_status } = require('@src/v1/utils/constants');
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
// const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
// const { AgentPayment } = require("@src/v1/models/app/procurement/AgentPayment");
// const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { AssociateOffers } = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { AgentInvoice } = require("@src/v1/models/app/payment/agentInvoice");
const xlsx = require("xlsx")

module.exports.payment = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '' } = req.query

        let query = search ? { reqNo: { $regex: search, $options: 'i' } } : {};

        const { portalId, user_id } = req


        const paymentIds = (await Payment.find({ ho_id: { $in: [portalId, user_id] }, bo_approve_status: _paymentApproval.approved })).map(i => i.req_id)

        const aggregationPipeline = [
            { $match: { _id: { $in: paymentIds } } },
            {
                $lookup: {
                    from: 'batches',
                    localField: '_id',
                    foreignField: 'req_id',
                    as: 'batches',
                    pipeline: [{
                        $lookup: {
                            from: 'payments',
                            localField: '_id',
                            foreignField: 'batch_id',
                            as: 'payment',
                        }
                    }],
                }
            },
            {
                $match: {
                    batches: { $ne: [] }
                }
            },
            // {
            //     $lookup: {
            //         from: 'branches',
            //         localField: 'branch_id',
            //         foreignField: '_id',
            //         as: 'branch',
            //     }
            // },
            // { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    approval_status: {
                        $cond: {
                            if: {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $or: [
                                                { $not: { $ifNull: ['$$batch.ho_approval_at', true] } },  // Check if the field is missing
                                                { $eq: ['$$batch.ho_approval_at', null] },  // Check for null value
                                            ]
                                        }
                                    }
                                }
                            },
                            then: 'Pending',
                            else: 'Approved'
                        }
                    },
                    qtyPurchased: {
                        $reduce: {
                            input: '$batches',
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.qty'] }  // Sum of qty from batches
                        }
                    },
                    amountPayable: {
                        $reduce: {
                            input: '$batches',
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.totalPrice'] }  // Sum of totalPrice from batches
                        }
                    },
                    payment_status: {
                        $cond: {
                            if: {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$batches',
                                        as: 'batch',
                                        in: {
                                            $anyElementTrue: {
                                                $map: {
                                                    input: '$$batch.payment',
                                                    as: 'pay',
                                                    in: {
                                                        $eq: ['$$pay.payment_status', 'Pending']  // Assuming status field exists in payments
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            then: 'Pending',
                            else: 'Approved'
                        }
                    }
                }
            },
            // { $unwind: '$branch' },
            {
                $project: {
                    _id: 1,
                    reqNo: 1,
                    product: 1,
                    // 'batches._id': 1,
                    // 'batches.qty': 1,
                    // 'batches.goodsPrice': 1,
                    // 'batches.totalPrice': 1,
                    // 'batches.status': 1,
                    approval_status: 1,
                    qtyPurchased: 1,
                    amountPayable: 1,
                    payment_status: 1,
                    branch: 1
                }
            },
            { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
        const records = await RequestModel.aggregate([
            ...aggregationPipeline,
            {
                $facet: {
                    data: aggregationPipeline, // Aggregate for data
                    totalCount: [{ $count: 'count' }] // Count the documents
                }
            }
        ]);

        const response = {
            count: records[0]?.totalCount[0]?.count || 0,
            rows: records[0]?.data || []
        };
        if (paginate == 1) {
            response.page = page
            response.limit = limit
            response.pages = limit != 0 ? Math.ceil(response.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: response, message: _response_message.found("Payment") }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.associateOrders = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', req_id, isExport = 0 } = req.query

        const { user_type, portalId, user_id } = req;

        if (user_type != _userType.ho) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const paymentIds = (await Payment.find({ ho_id: { $in: [portalId, user_id] }, req_id, bo_approve_status: _paymentApproval.approved })).map(i => i.associateOffers_id)
        let query = {
            _id: { $in: paymentIds },
            req_id,
            status: { $in: [_associateOfferStatus.partially_ordered, _associateOfferStatus.ordered] },
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };

        const records = { count: 0 };
        records.reqDetails = await RequestModel.findOne({ _id: req_id })
            .select({ _id: 1, reqNo: 1, product: 1, deliveryDate: 1, address: 1, quotedPrice: 1, status: 1 });
        records.rows = paginate == 1 ? await AssociateOffers.find(query)
            .populate({
                path: 'seller_id', select: '_id user_code basic_details.associate_details.associate_type basic_details.associate_details.associate_name'
            })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit)) : await AssociateOffers.find(query).sort(sortBy);

        records.count = await AssociateOffers.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Payment") }))
    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', associateOffer_id } = req.query
        const { user_type, portalId, user_id } = req

        const paymentIds = (await Payment.find({ ho_id: { $in: [portalId, user_id] }, associateOffers_id: associateOffer_id, bo_approve_status: _paymentApproval.approved })).map(i => i.batch_id)
        let query = {
            _id: { $in: paymentIds },
            associateOffer_id,
            ...(search ? { order_no: { $regex: search, $options: 'i' } } : {}) // Search functionality
        };
        const records = { count: 0 };

        records.rows = paginate == 1 ? await Batch.find(query)
            .sort(sortBy)
            .skip(skip)
            .select('_id procurementCenter_id batchId delivered.delivered_at qty goodsPrice totalPrice payement_approval_at payment_approve_by bo_approve_status ho_approve_status')
            .limit(parseInt(limit)) : await Batch.find(query).sort(sortBy);

        records.count = await Batch.countDocuments(query);

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _query.get('Payment') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.batchApprove = async (req, res) => {

    try {

        const { batchIds } = req.body;
        const { portalId } = req;

        const record = await Batch.findOne({
            _id: { $in: batchIds },
            "dispatched.qc_report.received_qc_status": { $ne: received_qc_status.accepted },
            bo_approve_status: _paymentApproval.pending
        })
        if (record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "Qc is not done and branch approved on selected batches" }] }));
        }


        const result = await Batch.updateMany(
            { _id: { $in: batchIds } },  // Match any batchIds in the provided array
            { $set: { status: _batchStatus.FinalPayApproved, ho_approval_at: new Date(), ho_approve_by: portalId, ho_approve_status: _paymentApproval.approved } } // Set the new status for matching documents
        );

        if (result.matchedCount === 0) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: "No matching Batch found" }] }));
        }
        await Payment.updateMany(
            { batch_id: { $in: batchIds } },
            { $set: { ho_approve_status: _paymentApproval.approved, ho_approve_at: new Date(), ho_approve_by: portalId } }
        )

        return res.status(200).send(new serviceResponse({ status: 200, message: `${result.modifiedCount} Batch Approved successfully` }));


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.qcReport = async (req, res) => {

    try {
        const { id } = req.query;
        const { user_type } = req;

        if (user_type != _userType.ho) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.Unauthorized("user") }] }))
        }

        const qcReport = await Batch.findOne({ _id: id })
            .populate({
                path: 'req_id', select: '_id reqNo product address quotedPrice fulfilledQty totalQuantity expectedProcurementDate'
            })

        return res.status(200).send(new serviceResponse({ status: 200, data: qcReport, message: _query.get('Qc Report') }))
    }
    catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.lot_list = async (req, res) => {

    try {

        const { batch_id } = req.query;

        const record = await Batch.findOne({ _id: batch_id }).populate({ path: "farmerOrderIds.farmerOrder_id", select: "metaData.name order_no" }).select('_id farmerOrderIds');

        if (!record) {
            return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("Farmer") }] }))
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("Farmer") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

// dileep code 

module.exports.orderList = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', user_type, isExport = 0, isFinal = 0 } = req.query

        const portalId = req.user.portalId._id
        const user_id = req.user._id

        let query = search ? { req_id: { $regex: search, $options: 'i' }, ho_id: { $in: [portalId, user_id] } } : { ho_id: { $in: [portalId, user_id] } };

        const records = { count: 0, rows: [] };

        query = {...query, bo_approve_status: _paymentApproval.approved }

        if(isFinal== 1){
            query = { ...query, ho_approve_status: _paymentApproval.approved}
        }
        console.log("query-->", query)
        records.rows = await AgentInvoice.find(query).populate({path:"req_id", select: " "})
        console.log('records.rows-->', records.rows)

        records.count = await AgentInvoice.countDocuments(query)

        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        

        records.rows = records.rows.map(item=>{ 
            let obj = { 

                _id: item?._id,
                orderId: item?.req_id?.reqNo,
                branchNo: item?.batch_id?.branchId,
                commodity: item?.req_id?.product?.name,
                quantityPurchased: item?.qtyProcured,
                billingDate: item?.createdAt,
                ho_approve_status: item.ho_approve_status
            }

            return obj
        })


        if (isExport == 1) {

            const record = records.rows.map((item) => {
                return {
                    "Order ID": item?.orderId || 'NA',
                    "Commodity": item?.commodity || 'NA',
                    "Quantity Purchased": item?.quantityPurchased || 'NA',
                    "Billing Date": item?.billingDate ?? 'NA',
                    "Approval Status": item?.ho_approve_status ?? 'NA'
                }
            })

            if (record.length > 0) {

                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `orderId-record.xlsx`,
                    worksheetName: `orderId-record`
                });
            } else {
                return res.status(200).send(new serviceResponse({ status: 400, data: records, message: _response_message.notFound("Order") }))
            }
        } else {
            return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Order") }))
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.agencyInvoiceById = async (req, res) => {

    try {
        const agencyInvoiceId = req.params.id

        const portalId = req.user.portalId._id
        const user_id = req.user._id


        const query = {_id: agencyInvoiceId, ho_id: { $in: [portalId, user_id] } }

        const agentBill = await AgentInvoice.findOne(query).select('_id bill')
        if(!agentBill){
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
        }

        return res.status(200).send(new serviceResponse({ status: 200, data: agentBill, message: _query.get('Invoice') }))

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.hoBillApproval = async (req, res) => {


    try {

        const agencyInvoiceId = req.params.id

        const portalId = req.user.portalId._id
        const user_id = req.user._id


        const query = {_id: agencyInvoiceId, ho_id: { $in: [portalId, user_id] } }

        const agentBill = await AgentInvoice.findOne(query);
        if(!agentBill){
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
        }

        agentBill.ho_approve_status = _paymentApproval.approved;
        agentBill.ho_approve_by = req.user._id;
        agentBill.ho_approve_at = new Date()

        await agentBill.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: "Bill Approved by HO" }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.editBillHo = async (req, res) => {

    try {

        const agencyInvoiceId = req.params.id
        const bill = req.body.bill
        if(!bill){
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill payload') }] }));
        }

        const portalId = req.user.portalId._id
        const user_id = req.user._id


        const query = {_id: agencyInvoiceId, ho_id: { $in: [portalId, user_id] } }
        

        const agentBill = await AgentInvoice.findOne(query);
        if(!agentBill){
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
        }

        if(agentBill.ho_approve_status === _paymentApproval.approved){
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.canNOtBeEdited() }] }));
        }

        agentBill.logs.push({...agentBill.bill, editedBy: req.user._id , editedAt: new Date() })
        agentBill.bill = bill

        await agentBill.save();

        return res.status(200).send(new serviceResponse({ status: 200, message: "Bill edited by BO" }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.payAgent = async (req, res) => {

    try {

    const agencyInvoiceId = req.params.id

    const portalId = req.user.portalId._id
    const user_id = req.user._id
    const query = {_id: agencyInvoiceId, 
                    ho_id: { $in: [portalId, user_id] } ,
                    bo_approve_status: _paymentApproval.approved,
                    ho_approve_status: _paymentApproval.approved }

    const agentBill = await AgentInvoice.findOne(query).select('_id bill bankfileLastNumber')
    if(!agentBill){
            return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound('Bill') }] }));
    }


     const paymentFileData = [
        { 
            "CLIENT CODE (NCCFMAIZER)": "NCCFMAIZER",
            "PIR_REF_NO":"",
            "MY_PRODUCT_CODE(It should be Digital Products only)":"",
            "Amount":agentBill.bill.total || "No Amount",
            "Acc no(2244102000000055)":"",
            "IFSC Code":"",
            "Account Name":"",
            "Account no":"",
            "PAYMENT_REF":"",
            "PAYMENT_DETAILS":"",
        }
     ]
  
  
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(paymentFileData);
  
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Agent Payment');
  
      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'csv' });

      res.setHeader('Content-Disposition', `attachment; filename=${generateFileName('NCCFMAIZER',agentBill.bankfileLastNumber, )}`);
      res.setHeader('Content-Type', 'text/csv');
      
      return res.status(200).send(excelBuffer);
    } catch (err) {
      _handleCatchErrors(err, res);
    }
};
