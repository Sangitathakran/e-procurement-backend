const {
  _handleCatchErrors,
  _generateOrderNumber,
  _addDays,
  handleDecimal,
} = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const {
  _query,
  _response_message,
} = require("@src/v1/utils/constants/messages");
const { RequestModel } = require("@src/v1/models/app/procurement/Request");
const { Scheme } = require("@src/v1/models/master/Scheme");
const {
  _requestStatus,
  _webSocketEvents,
  _procuredStatus,
  _collectionName,
} = require("@src/v1/utils/constants");
const {
  AssociateOffers,
} = require("@src/v1/models/app/procurement/AssociateOffers");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { _associateOfferStatus, _userType } = require("@src/v1/utils/constants");
const moment = require("moment");
const { eventEmitter } = require("@src/v1/utils/websocket/server");
const mongoose = require("mongoose");
const { Bank } = require("@src/v1/models/app/farmerDetails/Bank");
const {
  asyncErrorHandler,
} = require("@src/v1/utils/helpers/asyncErrorHandler");
const { User } = require("@src/v1/models/app/auth/User");
const { FarmerOrders } = require("@src/v1/models/app/procurement/FarmerOrder");
const { Batch } = require("@src/v1/models/app/procurement/Batch");

module.exports.getProcurement = async (req, res) => {
  try {
    const { user_id } = req;
    const {
      page = 1,
      limit = 10,
      commodity = "",
      state = "",
      skip = 0,
      paginate = 1,
      sortBy,
      search = "",
      status,
    } = req.query;
    // Build query for search
   
    let query = search
      ? {
          $or: [
            { reqNo: { $regex: search, $options: "i" } },
            { "product.name": { $regex: search, $options: "i" } },
            { "product.grade": { $regex: search, $options: "i" } },
            { reqNo: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    if (commodity) {
      const commodityArray = Array.isArray(commodity) ? commodity : [commodity];
      query["product.name"] = { $in: commodityArray };
    }

     if (state) {
      const stateArray = Array.isArray(state) ? state : [state];
     
       query["associateUserDetails.address.registered.state"] = { $in: stateArray };
    }

    if (status) {
      // Handle status-based filtering
      const conditionPipeline = [];
      if (status === _associateOfferStatus.ordered) {
        conditionPipeline.push(
          {
            $lookup: {
              from: "batches",
              localField: "_id",
              foreignField: "req_id",
              as: "batches",
            },
          },
          {
            $addFields: {
              batchesCount: { $size: "$batches" }, // Add batch count
            },
          }
        );
      }

      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "associateoffers",
            localField: "_id",
            foreignField: "req_id",
            as: "myoffer",
          },
        },
        {
          $lookup: {
            from: "payments",
            // localField: "_id",
            // foreignField: "req_id",
            let: { reqId: "$_id" },
             pipeline: [
                      {
                $match: {
                  $expr: {
                    $eq: ["$req_id", "$$reqId"]
                  }
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
                      {
                $project: {
                  _id: 0,
                  associate_id: 1,
                },
              },
            ],
            as: "payments",
          },
        },
        {
          $unwind: {
            path: "$payments",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            let: { associateId: "$payments.associate_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$associateId"] },
                },
              },
              {
                $project: {
                  _id: 0,
                  address: 1, // adjust based on what fields you need
                },
              },
            ],
            as: "associateUserDetails",
          },
        },
        {
          $unwind: {
            path: "$associateUserDetails",
            preserveNullAndEmptyArrays: true,
          },
        },

        ...conditionPipeline,
        { $unwind: "$myoffer" },
        {
          $match: {
            "myoffer.seller_id": new mongoose.Types.ObjectId(user_id),
            ...(status === _associateOfferStatus.pending ||
            status === _associateOfferStatus.rejected
              ? { "myoffer.status": status }
              : {}),
            ...(status === _associateOfferStatus.accepted
              ? {
                  "myoffer.status": {
                    $in: [
                      _associateOfferStatus.accepted,
                      _associateOfferStatus.partially_ordered,
                      _associateOfferStatus.ordered,
                    ],
                  },
                }
              : {}),
            ...(status === _associateOfferStatus.ordered
              ? {
                  "myoffer.status": {
                    $in: [
                      _associateOfferStatus.ordered,
                      _associateOfferStatus.partially_ordered,
                    ],
                  },
                }
              : {}),
          },
        },

        // Lookup Head Office details
        {
          $lookup: {
            from: "headoffices",
            let: { head_office_id: "$head_office_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", { $toObjectId: "$$head_office_id" }] },
                },
              },
              {
                $project: {
                  headOfficesName: "$company_details.name",
                  _id: 0,
                },
              },
            ],
            as: "headOfficeDetails",
          },
        },
        {
          $unwind: {
            path: "$headOfficeDetails",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Lookup SLA details
        {
          $lookup: {
            from: "slas",
            let: { sla_id: "$sla_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$sla_id"] } } },
              {
                $project: {
                  slaName: "$basic_details.name",
                  _id: 0,
                },
              },
            ],
            as: "slaDetails",
          },
        },
        { $unwind: { path: "$slaDetails", preserveNullAndEmptyArrays: true } },

        // Lookup Scheme details
        {
          $lookup: {
            from: "schemes",
            let: { schemeId: "$product.schemeId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$schemeId"] } } },
              {
                $project: {
                  schemeName: 1,
                  season: 1,
                  period: 1,
                  _id: 0,
                  commodity_id: 1,
                  procurementDuration: 1,
                },
              },
            ],
            as: "schemeDetails",
          },
        },
        {
          $unwind: { path: "$schemeDetails", preserveNullAndEmptyArrays: true },
        },
        // Lookup Commodity details from schemeDetails.commodity_id
        {
          $lookup: {
            from: "commodities",
            let: { commodityId: "$schemeDetails.commodity_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$commodityId"] },
                },
              },
              {
                $project: {
                  name: 1,
                  category: 1,
                  unit: 1,
                  _id: 0,
                },
              },
            ],
            as: "commodityDetails",
          },
        },
        {
          $unwind: {
            path: "$commodityDetails",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "branches",
            let: { branch_id: "$branch_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", { $toObjectId: "$$branch_id" }] },
                },
              },
              {
                $project: {
                  branchName: "$branchName",
                  _id: 0,
                },
              },
            ],
            as: "branchDetails",
          },
        },
        {
          $unwind: { path: "$branchDetails", preserveNullAndEmptyArrays: true },
        },
        // Add computed fields
        {
          $addFields: {
            schemeName: {
              $concat: [
                { $ifNull: ["$schemeDetails.schemeName", ""] },
                " ",
                { $ifNull: ["$commodityDetails.name", ""] },
                " ",
                { $ifNull: ["$schemeDetails.season", ""] },
                " ",
                { $ifNull: ["$schemeDetails.period", ""] },
              ],
            },
            slaName: { $ifNull: ["$slaDetails.slaName", "N/A"] },
            headOfficesName: {
              $ifNull: ["$headOfficeDetails.headOfficesName", "N/A"],
            },
            branchName: { $ifNull: ["$branchDetails.branchName", "N/A"] },
            commodityName: { $ifNull: ["$commodityDetails.name", "N/A"] },
            procurementDuration: {
              $ifNull: ["$schemeDetails.procurementDuration", "N/A"],
            },
          },
        },

        { $sort: sortBy || { createdAt: -1 } },
        { $skip: parseInt((page - 1) * limit) || 0 },
        { $limit: parseInt(limit) || 10 },
      ];

      // Use pipeline for fetching rows and counting
      const countPipeline = [...pipeline.slice(0, -2), { $count: "count" }];
      const countResult = await RequestModel.aggregate(countPipeline);
      const records = {
        rows: await RequestModel.aggregate(pipeline),
        count: countResult.length > 0 ? countResult[0].count : 0,
      };

      if (paginate === 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages =
          records.limit !== 0 ? Math.ceil(records.count / records.limit) : 0;
      }

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("procurement"),
        })
      );
    } else {
      // Handle requests with no offers or open status
      query.status = {
        $in: [_requestStatus.open, _requestStatus.partially_fulfulled],
      };
      // query.quoteExpiry = { $gte: new Date() };

      const rows =
        paginate === 1
          ? await RequestModel.find(query)
              .populate({
                path: "head_office_id",
                select: "company_details.name",
              })
              .populate({ path: "sla_id", select: "_id basic_details.name" })
              .populate({ path: "branch_id", select: "branchName" })
              .populate({
                path: "product.schemeId",
                // select: "schemeName procurementDuration",
                select: "schemeName procurementDuration season period commodity_id",
                populate: {
                path: "commodity_id",
                model: "Commodity",
                select: "name",
              },
              })
              .sort(sortBy || { createdAt: -1 })
              .skip(parseInt(skip))
              .limit(parseInt(limit))
          : await RequestModel.find(query).sort(sortBy || { createdAt: -1 });

      const count = await RequestModel.countDocuments(query);
      const mappedRows = rows.map((item) => {
        const scheme = item?.product?.schemeId || {};
        const commodityName = scheme?.commodity_id?.name || "";
        const schemeName = [scheme.schemeName, commodityName, scheme.season, scheme.period]
        .filter(Boolean)
        .join("")
        .replace(/\s+/g, "")
        .trim();
        return {
          ...item._doc,
          schemeName: schemeName || "N/A",
        };
      });

      const records = { rows: mappedRows, count };
      if (paginate === 1) {
        records.page = parseInt(page);
        records.limit = parseInt(limit);
        records.pages =
        records.limit !== 0 ? Math.ceil(records.count / records.limit) : 0;
      }

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: records,
          message: _response_message.found("procurement"),
        })
      );
    }
  } catch (error) {
    console.log(error.message);
    _handleCatchErrors(error, res);
  }
};

module.exports.getProcurementById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req;

    // const record = await RequestModel.findOne({ _id: id }).lean();
    const record = await RequestModel.findOne({ _id: id })
      .lean()
      .populate([
        {
          path: "product.schemeId",
          select: "schemeName season period procurementDuration",
        },
        { path: "sla_id", select: "basic_details.name" },
        { path: "branch_id", select: "_id branchName branchId" },
        { path: "head_office_id", select: "_id company_details.name" },
      ]);

    if (!record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("procurement") }],
        })
      );
    }

    const scheme = record?.product?.schemeId;
    const commodityName = record?.product?.name || "";
    if (scheme) {
      scheme.schemeName = `${scheme.schemeName || ""} ${commodityName} ${
        scheme.season || ""
      } ${scheme.period || ""}`
        .trim()
        .replace(/\s+/g, " ");
    }
    record.myOffer = await AssociateOffers.findOne({
      req_id: id,
      seller_id: user_id,
    });

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: record,
        message: _response_message.found("procurement"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.updateProcurement = async (req, res) => {
  /*TODO : is this controller is in used or not ?  */
  try {
    const { user_id } = req;
    const {
      id,
      quotedPrice,
      deliveryDate,
      name,
      category,
      grade,
      variety,
      quantity,
      deliveryLocation,
      lat,
      long,
    } = req.body;

    const existingRecord = await RequestModel.findOne({ _id: id });

    if (!existingRecord) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("procurement") }],
        })
      );
    }

    const delivery_date = moment(deliveryDate).format("YYYY-MM-DD");

    if (moment(delivery_date).isBefore(quote_expiry_date)) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [
            {
              message: _response_message.invalid_delivery_date("Delivery date"),
            },
          ],
        })
      );
    }

    const update = {
      quotedPrice: handleDecimal(quotedPrice),
      deliveryDate: delivery_date,
      product: { name, category, grade, variety, quantity },
      address: { deliveryLocation, lat, long },
      updated_by: user_id,
    };

    const updatedProcurement = await RequestModel.findOneAndUpdate(
      { _id: id },
      update,
      { new: true }
    );

    eventEmitter.emit(_webSocketEvents.procurement, {
      ...updatedProcurement,
      method: "updated",
    });

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: updatedProcurement,
        message: _response_message.updated("procurement"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.associateOffer = async (req, res) => {
  try {
    const { user_id } = req;
    const { req_id, farmer_data = [], qtyOffered } = req.body;

    if (farmer_data.length == 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("farmer data") }],
        })
      );
    }
    const existingProcurementRecord = await RequestModel.findOne({
      _id: req_id,
    });

    if (!existingProcurementRecord) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("request") }],
        })
      );
    }

    const existingRecord = await AssociateOffers.findOne({
      seller_id: user_id,
      req_id: req_id,
    });

    // if (existingRecord) {
    //     return res.status(400).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("offer") }] }))
    // }

    const sumOfFarmerQty = farmer_data.reduce((acc, curr) => {
      acc = acc + handleDecimal(curr.qty);

      return handleDecimal(acc);
    }, 0);

    if (sumOfFarmerQty != handleDecimal(qtyOffered)) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "please check details! quantity mismatched" }],
        })
      );
    }

    const { fulfilledQty, product } = existingProcurementRecord;

    if (qtyOffered > product?.quantity - fulfilledQty) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: "incorrect quantity of request" }],
        })
      );
    }

    for (let harvester of farmer_data) {
      if (!(await farmer.findOne({ _id: harvester._id })))
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            errors: [{ message: _response_message.notFound("farmer") }],
          })
        );
    }

    let associateOfferRecord;

    if (existingRecord) {
      // checks for associates offer status
      if (existingRecord.status == _associateOfferStatus.pending) {
        return res.status(200).send(
          new serviceResponse({
            status: 400,
            errors: [{ message: "Offer not accepted by admin." }],
          })
        );
      }

      // checks for associates's farmer offer status
      const existingFarmerOffer = await FarmerOrders.findOne({
        associateOffers_id: existingRecord._id,
        status: _procuredStatus.pending,
      });

      if (existingFarmerOffer) {
        return res.status(200).send(
          new serviceResponse({
            status: 400,
            errors: [{ message: "Associate's farmer offer not recieved yet." }],
          })
        );
      }

      // add new farmer oder
      existingRecord.offeredQty = handleDecimal(
        sumOfFarmerQty + existingRecord.offeredQty
      );
      associateOfferRecord = existingRecord.save();

      // update request's fulfilledQty and status
      const existingRequestModel = await RequestModel.findOne({ _id: req_id });

      existingRequestModel.fulfilledQty = handleDecimal(
        existingRequestModel.fulfilledQty + sumOfFarmerQty
      );
      if (
        handleDecimal(existingRequestModel.fulfilledQty) ==
        handleDecimal(existingRequestModel?.product?.quantity)
      ) {
        existingRequestModel.status = _requestStatus.fulfilled;
      } else if (
        handleDecimal(existingRequestModel.fulfilledQty) <
        handleDecimal(existingRequestModel?.product?.quantity)
      ) {
        existingRequestModel.status = _requestStatus.partially_fulfulled;
      } else {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            errors: [
              {
                message: "this request cannot be processed! quantity exceeds",
              },
            ],
          })
        );
      }
      await existingRequestModel.save();

      const dataToBeInserted = [];
      const offerToBeInserted = [];

      for (let harvester of farmer_data) {
        const existingFarmer = await farmer.findOne({ _id: harvester._id });
        const { name, father_name, address_line, mobile_no, farmer_code } =
          existingFarmer;

        const metaData = {
          name,
          father_name,
          address_line,
          mobile_no,
          farmer_code,
        };

        const FarmerOfferData = {
          associateOffers_id: existingRecord._id,
          farmer_id: harvester._id,
          metaData,
          offeredQty: handleDecimal(harvester.qty),
          order_no: "OD" + _generateOrderNumber(),
        };

        const FarmerOffer = {
          associateOffers_id: existingRecord._id,
          farmer_id: harvester._id,
          metaData,
          offeredQty: handleDecimal(harvester.qty),
          createdBy: user_id,
        };

        dataToBeInserted.push(FarmerOfferData);

        offerToBeInserted.push(FarmerOffer);
      }

      await FarmerOrders.insertMany(dataToBeInserted);

      await FarmerOffers.insertMany(offerToBeInserted);
    } else {
      associateOfferRecord = await AssociateOffers.create({
        seller_id: user_id,
        req_id: req_id,
        offeredQty: sumOfFarmerQty,
        createdBy: user_id,
      });

      const dataToBeInserted = [];

      for (let harvester of farmer_data) {
        const existingFarmer = await farmer.findOne({ _id: harvester._id });
        const { name, father_name, address_line, mobile_no, farmer_code } =
          existingFarmer;

        const metaData = {
          name,
          father_name,
          address_line,
          mobile_no,
          farmer_code,
        };

        const FarmerOfferData = {
          associateOffers_id: associateOfferRecord._id,
          farmer_id: harvester._id,
          metaData,
          offeredQty: handleDecimal(harvester.qty),
          createdBy: user_id,
        };

        dataToBeInserted.push(FarmerOfferData);
      }

      await FarmerOffers.insertMany(dataToBeInserted);
    }
    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: associateOfferRecord,
        message: "offer submitted",
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getFarmerListById = async (req, res) => {
  try {
    const { user_id, user_type } = req; // Retrieve user_id and user_type from request
    // const { page = 1, limit = 10, skip = 0, paginate = 1, sortBy = 'name', search = '' } = req.query;
    const {
      page = 1,
      limit = 10,
      skip = 0,
      paginate = 1,
      sortBy,
      search = "",
    } = req.query;

    // Ensure only `associate` users can access this API
    if (user_type !== _userType.associate) {
      return res.status(200).send(
        new serviceResponse({
          status: 401,
          errors: [{ message: _response_message.Unauthorized() }],
        })
      );
    }

    // Build query to find farmers associated with the current user (associate)
    let query = {
      associate_id: new mongoose.Types.ObjectId(user_id), // Match farmers under current associate
      ...(search && { name: { $regex: search, $options: "i" } }), // Search functionality
    };

    // // Build aggregation pipeline
    // let aggregationPipeline = [
    //     { $match: query }, // Match by associate_id and optional search
    //     {
    //         // $sort: { [sortBy]: 1 } // Sort by the `sortBy` field, default to `name`
    //         $sort: sortBy ? sortBy : { createdAt: -1 },
    //     }
    // ];

    // let query = {
    //     external_farmer_id: { $ne: null }, // Match farmers under current associate
    //     ...(search && { name: { $regex: search, $options: 'i' } }) // Search functionality
    // };

    // Build aggregation pipeline
    let aggregationPipeline = [
      { $match: query }, // Match by associate_id and optional search

      // start of sangita code
      {
        $lookup: {
          from: "ekharidprocurements", // Collection name for farmers
          localField: "external_farmer_id",
          foreignField: "procurementDetails.farmerID",
          as: "ekharidprocurementDetails",
        },
      },
      {
        $unwind: {
          path: "$ekharidprocurementDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // end of sangita code
      {
        // $sort: { [sortBy]: 1 } // Sort by the `sortBy` field, default to `name`
        $sort: sortBy ? sortBy : { createdAt: -1 },
      },
    ];

    // Apply pagination if `paginate` is enabled
    if (paginate == 1) {
      aggregationPipeline.push(
        {
          $skip: parseInt(skip) || (parseInt(page) - 1) * parseInt(limit),
        },
        {
          $limit: parseInt(limit),
        }
      );
    }

    // Fetch count of farmers
    const countPipeline = [
      { $match: query },
      { $count: "total" }, // Count total records matching the criteria
    ];

    // Execute the count query
    const countResult = await farmer.aggregate(countPipeline);
    const totalRecords = countResult[0] ? countResult[0].total : 0;

    // Execute the main aggregation query
    const rows = await farmer.aggregate(aggregationPipeline);

    const records = {
      count: totalRecords,
      rows: rows,
    };

    // If pagination is enabled, add pagination metadata
    if (paginate == 1) {
      records.page = parseInt(page);
      records.limit = parseInt(limit);
      records.pages = limit != 0 ? Math.ceil(totalRecords / limit) : 0;
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _query.get("farmer"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.requestApprove = async (req, res) => {
  try {
    const { associateOffers_id, status } = req.body;
    const { user_type } = req;

    if (user_type != _userType.admin) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.Unauthorized("user") }],
        })
      );
    }

    const associateOffered = await AssociateOffers.findOne({
      _id: associateOffers_id,
    });

    if (!sellerOffered) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("seller offer") }],
        })
      );
    }

    if (status == _associateOfferStatus.rejected) {
      associateOffered.status = _associateOfferStatus.rejected;
    } else if (status == _associateOfferStatus.accepted) {
      const existingRequest = await RequestModel.findOne({
        _id: associateOffered.req_id,
      });

      if (!existingRequest) {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            errors: [{ message: _response_message.notFound("request") }],
          })
        );
      }

      existingRequest.fulfilledQty += associateOffered.offeredQty;

      if (existingRequest.fulfilledQty == existingRequest?.product?.quantity) {
        existingRequest.status = _requestStatus.fulfilled;
      } else if (
        existingRequest.fulfilledQty < existingRequest?.product?.quantity
      ) {
        existingRequest.status = _requestStatus.partially_fulfulled;
      } else {
        return res.status(400).send(
          new serviceResponse({
            status: 400,
            errors: [
              {
                message: "this request cannot be processed! quantity exceeds",
              },
            ],
          })
        );
      }

      await associateOffered.save();
      await existingRequest.save();

      return res.status(200).send(
        new serviceResponse({
          status: 200,
          data: existingRequest,
          message: "order accepted by admin",
        })
      );
    }
  } catch (error) {
    console.log(error.message);
    _handleCatchErrors(error, res);
  }
};

module.exports.offeredFarmerList = async (req, res) => {
  try {
    const { user_id, user_type } = req;
    const { page, limit, skip, sortBy, search = "", req_id } = req.query;

    const offerIds = (
      await AssociateOffers.find({
        req_id,
        ...(user_type == _userType.associate && { seller_id: user_id }),
      })
    ).map((ele) => ele._id);

    if (offerIds.length == 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("offer") }],
        })
      );
    }

    let query = search
      ? {
          $or: [
            { "metaData.name": { $regex: search, $options: "i" } },
            { "metaData.father_name": { $regex: search, $options: "i" } },
            { "metaData.mobile_no": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    query.associateOffers_id = { $in: offerIds };
    const records = { count: 0 };

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "farmers",
          localField: "farmer_id",
          foreignField: "_id",
          as: "farmer_data",
        },
      },
      { $unwind: "$farmer_data" },
      {
        $lookup: {
          from: "statedistrictcities",
          let: {
            stateId: "$farmer_data.address.state_id",
            districtId: "$farmer_data.address.district_id",
          },
          pipeline: [
            { $unwind: "$states" },
            { $match: { $expr: { $eq: ["$states._id", "$$stateId"] } } },

            { $unwind: "$states.districts" },
            {
              $match: {
                $expr: { $eq: ["$states.districts._id", "$$districtId"] },
              },
            },
            {
              $project: {
                state_title: "$states.state_title",
                district_title: "$states.districts.district_title",
              },
            },
          ],
          as: "location_data",
        },
      },

      { $unwind: { path: "$location_data", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          farmer_id: "$farmer_data.farmer_id",
          farmer_type: "$farmer_data.user_type",
          "farmer_data.name": 1,
          "farmer_data.mobile_no": 1,
          "farmer_data.basic_details": 1, // Include basic_details field
          "farmer_data.address": 1,
          "location_data.state_title": 1,
          "location_data.district_title": 1,
          offeredQty: 1,
          metaData: 1,
          status: 1,
        },
      },
      { $sort: sortBy ? { [sortBy]: 1 } : { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    records.rows = await FarmerOffers.aggregate(pipeline);

    records.count = await FarmerOffers.countDocuments(query);
    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found(),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.farmerOrderList = async (req, res) => {
  try {
    const { user_id, user_type } = req;
    const {
      page,
      limit,
      skip,
      sortBy,
      search = "",
      req_id,
      status,
    } = req.query;

    const offerIds = [
      (await AssociateOffers.findOne({ req_id, seller_id: user_id }))?._id,
    ];

    if (offerIds.length == 0) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound("offer") }],
        })
      );
    }
      let query = {};
      let farmerIdsFromSearch = [];
      if (search) {
        const matchedFarmers = await farmer.find({
          farmer_id: { $regex: search, $options: "i" },
        }).select("_id");

      farmerIdsFromSearch = matchedFarmers.map(f => f._id);
        
              query.$or =  [
                { "metaData.name": { $regex: search, $options: "i" } },
                { "metaData.father_name": { $regex: search, $options: "i" } },
                { "metaData.mobile_no": { $regex: search, $options: "i" } },
                { order_no: { $regex: search, $options: "i" } },
                ...(farmerIdsFromSearch.length > 0
                  ? [{ farmer_id: { $in: farmerIdsFromSearch } }]
                  : []),
                  ];
                }
    query.associateOffers_id = { $in: offerIds };

    if (status) {
      query.status = status;
    }

    // start of Sangita code

    if (status == _procuredStatus.received) {
      query.qtyRemaining = { $gt: 0 };
    }

    // End of Sangita code

    const records = { count: 0 };

    records.rows = await FarmerOrders.find(query)
      .sort(sortBy)
      .skip(skip)
      .populate("farmer_id")
      .populate({
        path: "procurementCenter_id",
        select: "center_name address point_of_contact",
      })
      .limit(parseInt(limit));

    records.count = await FarmerOrders.countDocuments(query);

    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found(),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getAcceptedProcurement = async (req, res) => {
  try {
    const { user_id } = req;
    const { page, limit, skip, paginate = 1, sortBy, search = "" } = req.query;
    let query = search
      ? {}
      : { status: _associateOfferStatus.accepted, seller_id: user_id };
    const records = { count: 0 };
    records.rows =
      paginate == 1
        ? await AssociateOffers.find(query)
            .populate({ path: "req_id" })
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))
        : await AssociateOffers.find(query)
            .populate({ path: "req_id" })
            .sort(sortBy);
    records.count = await AssociateOffers.countDocuments(query);
    if (paginate == 1) {
      records.page = page;
      records.limit = limit;
      records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
    }
    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: records,
        message: _response_message.found("accepted procurement"),
      })
    );
  } catch (error) {
    console.log(error.message);
    _handleCatchErrors(error, res);
  }
};

module.exports.editFarmerOffer = async (req, res) => {
  try {
    const {
      id,
      receving_date,
      qtyProcured,
      procurementCenter_id,
      weighbridge_name,
      weighbridge_no,
      tare_weight,
      gross_weight,
      net_weight,
      weight_slip,
      status = _procuredStatus.received,
      weighbridge_document,
      subStandard,
      no_of_bags,
      type_of_bags,
    } = req.body;
    const { user_id } = req;

    const record = await FarmerOrders.findOne({ _id: id });

    if (!record) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          errors: [{ message: _response_message.notFound() }],
        })
      );
    }

    if (record.offeredQty < handleDecimal(qtyProcured)) {
      return res.status(200).send(
        new serviceResponse({
          status: 400,
          errors: [
            {
              message:
                "quantity procured should be less than available quantity",
            },
          ],
        })
      );
    }

    record.receving_date = receving_date;
    record.qtyProcured = handleDecimal(qtyProcured);
    record.procurementCenter_id = procurementCenter_id;
    record.weighbridge_name = weighbridge_name;
    record.weighbridge_no = weighbridge_no;
    record.tare_weight = tare_weight;
    record.gross_weight = gross_weight;
    record.net_weight = net_weight;
    record.weight_slip = weight_slip;
    record.status = status;
    record.updatedBy = user_id;
    (record.weighbridge_document = weighbridge_document),
      (record.subStandard = subStandard),
      (record.no_of_bags = no_of_bags),
      (record.type_of_bags = type_of_bags),
      // Start of Sangita code

      (record.qtyRemaining = handleDecimal(qtyProcured));

    // End of Sangita code

    await record.save();

    if (status == _procuredStatus.received) {
      const associateOfferRecord = await AssociateOffers.findOne({
        _id: record?.associateOffers_id,
      });
      associateOfferRecord.procuredQty += handleDecimal(qtyProcured);
      await associateOfferRecord.save();
    }

    return res.status(200).send(
      new serviceResponse({
        status: 200,
        data: record,
        message: _response_message.updated("farmer"),
      })
    );
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};

module.exports.getAssociateOffers = asyncErrorHandler(async (req, res) => {
  const {
    page,
    limit,
    skip,
    paginate = 1,
    sortBy,
    search = "",
    req_id,
  } = req.query;

  const { user_type, user_id } = req;

  let query = search
    ? {
        $or: [],
      }
    : {};

  if (user_type == _userType.associate) {
    query.seller_id = user_id;
  }

  query.req_id = req_id;

  const records = { count: 0 };

  records.rows =
    paginate == 1
      ? await AssociateOffers.find(query)
          .sort(sortBy)
          .skip(skip)
          .limit(parseInt(limit))
      : await AssociateOffers.find(query).sort(sortBy);

  records.count = await AssociateOffers.countDocuments(query);

  if (paginate == 1) {
    records.page = page;
    records.limit = limit;
    records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
  }

  return res.status(200).send(
    new serviceResponse({
      status: 200,
      data: records,
      message: _response_message.found("seller offer"),
    })
  );
});

module.exports.hoBoList = async (req, res) => {
  try {
    const { search = "", user_type } = req.query;

    if (!user_type) {
      return res.status(400).send(
        new serviceResponse({
          status: 400,
          message: _middleware.require("user_type"),
        })
      );
    }

    let query = search ? { reqNo: { $regex: search, $options: "i" } } : {};

    if (user_type == _userType.ho) {
      query.user_type = _userType.ho;
    } else if (user_type == _userType.bo) {
      query.user_type = _userType.bo;
    }

    const response = await User.find(query).select({
      _id: 1,
      basic_details: 1,
    });
    // const response = await User.find(query);

    if (!response) {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          errors: [{ message: _response_message.notFound("User") }],
        })
      );
    } else {
      return res.status(200).send(
        new serviceResponse({
          status: 200,
          errors: [{ message: _response_message.found("User") }],
        })
      );
    }
  } catch (error) {
    _handleCatchErrors(error, res);
  }
};
