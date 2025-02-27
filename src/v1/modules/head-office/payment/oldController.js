module.exports.payment = async (req, res) => {
    try {
      let { page = 1, limit = 50, search = "", isExport = 0 } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
  
      const { portalId, user_id } = req;
  
      // Ensure necessary indexes are created (run once in your database setup)
      await Payment.createIndexes({ ho_id: 1, bo_approve_status: 1 });
      await RequestModel.createIndexes({ reqNo: 1, createdAt: -1 });
      await Batch.createIndexes({ req_id: 1 });
      await Payment.createIndexes({ batch_id: 1 });
      await Branches.createIndexes({ _id: 1 });
  
      // Step 1: Get relevant payment IDs
      const paymentIds = await Payment.distinct("req_id", {
        ho_id: { $in: [portalId, user_id] },
        bo_approve_status: _paymentApproval.approved,
      });
  
      if (paymentIds.length === 0) {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            data: { count: 0, rows: [] },
            message: _response_message.found("Payment"),
          })
        );
      }
  
      // Step 2: Construct the Query
      let query = {
        _id: { $in: paymentIds },
        ...(search ? { reqNo: { $regex: search, $options: "i" } } : {}),
      };
  
      // Step 3: Get total count (without full aggregation)
      const totalCount = await RequestModel.countDocuments(query);
  
      // Step 4: Aggregation Pipeline with Optimized Lookups
      const aggregationPipeline = [
        { $match: query },
        {
          $lookup: {
            from: "batches",
            localField: "_id",
            foreignField: "req_id",
            as: "batches",
            pipeline: [
              { $match: { qty: { $exists: true } } }, // Only fetch relevant documents
              {
                $lookup: {
                  from: "payments",
                  localField: "_id",
                  foreignField: "batch_id",
                  as: "payment",
                  pipeline: [{ $project: { payment_status: 1 } }], // Fetch only needed fields
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "branches",
            localField: "branch_id",
            foreignField: "_id",
            as: "branch",
          },
        },
        { $unwind: "$branch" },
        { $match: { "batches.0": { $exists: true } } }, // Ensure there are batches
        {
          $addFields: {
            approval_status: {
              $cond: {
                if: {
                  $anyElementTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $or: [
                          { $not: { $ifNull: ["$$batch.ho_approval_at", true] } },
                          { $eq: ["$$batch.ho_approval_at", null] },
                        ],
                      },
                    },
                  },
                },
                then: "Pending",
                else: "Approved",
              },
            },
            qtyPurchased: {
              $sum: "$batches.qty",
            },
            amountPayable: {
              $sum: "$batches.totalPrice",
            },
            amountPaid: {
              $sum: "$batches.totalPrice",
            },
            payment_status: {
              $cond: {
                if: {
                  $anyElementTrue: {
                    $map: {
                      input: "$batches",
                      as: "batch",
                      in: {
                        $anyElementTrue: {
                          $map: {
                            input: "$$batch.payment",
                            as: "pay",
                            in: {
                              $in: [
                                "$$pay.payment_status",
                                ["Pending", "In Progress"],
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
                then: "Pending",
                else: "Completed",
              },
            },
            overall_payment_status: {
              $switch: {
                branches: [{
                  case: {
                    $allElementsTrue: {
                      $map: {
                        input: "$batches",
                        as: "batch",
                        in: {
                          $allElementsTrue: {
                            $map: {
                              input: "$$batch.payment",
                              as: "pay",
                              in: { $eq: ["$$pay.payment_status", "Pending"] },
                            },
                          },
                        },
                      },
                    },
                  },
                  then: "Pending",
                },
                {
                  case: {
                    $allElementsTrue: {
                      $map: {
                        input: "$batches",
                        as: "batch",
                        in: {
                          $allElementsTrue: {
                            $map: {
                              input: "$$batch.payment",
                              as: "pay",
                              in: { $eq: ["$$pay.payment_status", "Completed"] },
                            },
                          },
                        },
                      },
                    },
                  },
                  then: "Completed",
                },
                {
                  case: {
                    $allElementsTrue: {
                      $map: {
                        input: "$batches",
                        as: "batch",
                        in: {
                          $allElementsTrue: {
                            $map: {
                              input: "$$batch.payment",
                              as: "pay",
                              in: { $eq: ["$$pay.payment_status", "In Progress"] },
                            },
                          },
                        },
                      },
                    },
                  },
                  then: "Payment initiated",
                },
                {
                  case: {
                    $anyElementTrue: {
                      $map: {
                        input: "$batches",
                        as: "batch",
                        in: {
                          $anyElementTrue: {
                            $map: {
                              input: "$$batch.payment",
                              as: "pay",
                              in: { $in: ["$$pay.payment_status", ["Pending", "In Progress", "Failed", "Rejected"]] },
                            },
                          },
                        },
                      },
                    },
                  },
                  then: "Partially initiated",
                }
                ],
                default: "Pending", // Default case when no action is taken
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            reqNo: 1,
            product: 1,
            branch_id: 1,
            "branch._id": 1,
            "branch.branchName": 1,
            approval_status: 1,
            qtyPurchased: 1,
            amountPayable: 1,
            amountPaid: 1,
            payment_status: 1,
            overall_payment_status:1
          },
        },
        { $sort: { payment_status: -1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
  
      const records = await RequestModel.aggregate(aggregationPipeline);
  
      // Step 5: Prepare Response
      const response = {
        count: totalCount,
        rows: records,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      };
  
      if (isExport == 1) {
        // Export logic
        const record = response.rows.map((item) => ({
          "Order ID": item?.reqNo || "NA",
          "Branch Name": item?.branch?.branchName || "NA",
          Commodity: item?.product?.name || "NA",
          "Quantity Purchased": item?.qtyPurchased || "NA",
          "Approval Status": item?.approval_status ?? "NA",
          "Payment Status": item?.payment_status ?? "NA",
        }));
  
        if (record.length > 0) {
          return dumpJSONToExcel(req, res, {
            data: record,
            fileName: `HO-Payment-record.xlsx`,
            worksheetName: `HO-Payment-record`,
          });
        } else {
          return res.status(400).send(
            new serviceResponse({
              status: 400,
              data: [],
              message: _response_message.notFound("Payment"),
            })
          );
        }
      } else {
        return res.status(200).send(
          new serviceResponse({
            status: 200,
            data: response,
            message: _response_message.found("Payment"),
          })
        );
      }
    } catch (error) {
      _handleCatchErrors(error, res);
    }
  };