const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel, _generateOrderNumber } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { wareHousev2 } = require('@src/v1/models/app/warehouse/warehousev2Schema');
const { PurchaseOrderModel } = require('@src/v1/models/app/distiller/purchaseOrder');
const { BatchOrderProcess } = require('@src/v1/models/app/distiller/batchOrderProcess');


module.exports.saveWarehouseDetails = async (req, res) => {
    try {
        // Get the token from headers or cookies
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(401).send(
                new serviceResponse({
                    status: 401,
                    message: 'Token is required.',
                })
            );
        }

        // Decrypt and verify the token
        const decode = await decryptJwtToken(getToken);
        const ownerId = decode.data.organization_id; // Extract owner ID from token

        // Extract warehouse data from the request body
        const {
            basicDetails,
            addressDetails,
            documents,
            authorizedPerson,
            bankDetails,
            servicePricing,
            procurement_partner
        } = req.body;

        // Validate required fields
        if (!basicDetails || !basicDetails.warehouseName || !basicDetails.warehouseCapacity) {
            return res.status(400).send(
                new serviceResponse({
                    status: 400,
                    message: 'Basic details are required (warehouseName and warehouseCapacity).',
                })
            );
        }

        let randomVal;

        // Generate a sequential order number
        const lastWarehouse = await wareHouseDetails.findOne().sort({ createdAt: -1 }).select("wareHouse_code").lean();
        if (lastWarehouse && lastWarehouse?.wareHouse_code) {
            // Extract the numeric part from the last order's poNo and increment it 
            const lastNumber = parseInt(lastWarehouse.wareHouse_code.replace(/\D/g, ''), 10); // Remove non-numeric characters
            randomVal = `WHR${lastNumber + 1}`;
        } else {
            // Default starting point if no orders exist
            randomVal = "WHR1001";
        }
    
        // Create a new warehouse record
        const warehouse = new wareHouseDetails({
            warehouseOwnerId: ownerId,
            warehouseDetailsId: randomVal,
            basicDetails,
            addressDetails,
            documents,
            authorizedPerson: authorizedPerson,
            bankDetails,
            servicePricing: Array.isArray(servicePricing) ? servicePricing : [],
            procurement_partner,
        });

        // Save the warehouse to the database
        await warehouse.save();

        // Return success response
        return res.status(200).send(
            new serviceResponse({
                message: 'Warehouse details saved successfully.',
                data: {
                    warehouse,
                },
            })
        );
    } catch (error) {
        // Handle errors
        _handleCatchErrors(error, res);
    }
};

module.exports.getWarehouseList = async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'asc',
        isExport = 0,
        state,
        city
    } = req.query;

    const { warehouseIds } = req.body; // Get selected warehouse IDs from the request body

    try {
        // Decode token and get the user ID
        const token = req.headers.token || req.cookies.token;
        if (!token) {
            return res.status(401).send(new serviceResponse({ status: 401, message: "Token is required" }));
        }

        const decoded = await decryptJwtToken(token);
        const userId = decoded.data.organization_id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }

        // Construct query for filtering warehouses
        const query = {
            warehouseOwnerId: userId, // Fetch only the warehouses owned by the logged-in user
            ...(search && {
                $or: [
                    { "basicDetails.warehouseName": { $regex: search, $options: 'i' } },
                    { "wareHouse_code": { $regex: search, $options: 'i' } },
                    { "addressDetails.city": { $regex: search, $options: 'i' } },
                    { "addressDetails.state.state_name": { $regex: search, $options: 'i' } },
                ]
            }),
            ...(warehouseIds && { _id: { $in: warehouseIds } }), // Filter by selected warehouse IDs
            ...(state && { "addressDetails.state.state_name": { $regex: state, $options: 'i' } }), // Filter by state
            ...(city && { "addressDetails.city": { $regex: city, $options: 'i' } }) // Filter by country
        };

        // Fetch data with pagination and sorting
        const warehouses = await wareHouseDetails.find(query)
            .select()
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Count total warehouses
        const totalWarehouses = await wareHouseDetails.countDocuments(query);
        const activeWarehouses = await wareHouseDetails.countDocuments({ ...query, active: true });
        const inactiveWarehouses = totalWarehouses - activeWarehouses;

        // Handle export functionality
        if (isExport == 1) {
            const exportData = warehouses.map(item => ({
                "Warehouse ID": item.wareHouse_code,//item._id,
                "Warehouse Name": item.basicDetails?.warehouseName || 'NA',
                "City": item.addressDetails?.city || 'NA',
                "State": item.addressDetails?.state?.state_name || 'NA',
                "Status": item.active ? 'Active' : 'Inactive',
            }));


            if (exportData.length) {
                return dumpJSONToExcel(req, res, {
                    data: exportData,
                    fileName: `Warehouse-List.xlsx`,
                    worksheetName: `Warehouses`
                });
            }

            return res.status(200).send(new serviceResponse({ status: 200, message: "No data available for export" }));
        }

        // Return paginated results
        return res.status(200).send(new serviceResponse({
            status: 200,
            data: {
                records: warehouses,
                page,
                limit,
                totalRecords: totalWarehouses,
                activeRecords: activeWarehouses,
                inactiveRecords: inactiveWarehouses,
                pages: Math.ceil(totalWarehouses / limit)
            },
            message: "Warehouses fetched successfully"
        }));
    } catch (error) {
        console.error(error);
        return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching warehouses", error: error.message }));
    }
};

module.exports.editWarehouseDetails = async (req, res) => {
    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.organization_id;

        if (!mongoose.Types.ObjectId.isValid(UserId)) {
            return res.status(400).json({ status: 400, message: "Invalid user ID in token" });
        }

        const { warehouse_id, ...updatedFields } = req.body;

        if (!warehouse_id) {
            return res.status(400).json({ status: 400, message: "Warehouse id is required" });
        }

        // Find the warehouse by warehouse_code
        const warehouse = await wareHouseDetails.findOne({ _id: new mongoose.Types.ObjectId(warehouse_id) });

        if (!warehouse) {
            return res.status(404).json({ status: 404, message: "Warehouse not found" });
        }

        // Update only the provided fields
        const updatedWarehouse = await wareHouseDetails.findOneAndUpdate(
            { _id: warehouse_id },
            { $set: updatedFields },
            { new: true, runValidators: true }
        );

        // Return the updated warehouse details
        return res.status(200).json({
            status: 200,
            message: "Warehouse details updated successfully",
            data: updatedWarehouse
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: 500,
            message: "An error occurred while updating warehouse details",
            error: error.message
        });
    }
};

module.exports.updateWarehouseStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the warehouse by ID
        const warehouse = await wareHouseDetails.findById(id);
        console.log(warehouse);

        if (!warehouse) {
            return res.status(404).json({ message: 'Warehouse not found' });
        }

        // Toggle the active status
        warehouse.active = !warehouse.active;

        // Save the updated warehouse
        await warehouse.save();

        return sendResponse({ res, status: 200, data: warehouse, message: `Warehouse status updated successfully to ${warehouse.active ? 'Active' : 'Inactive'}` })
    } catch (error) {
        return res.status(500).json({ message: 'An error occurred', error: error.message });
    }
}


module.exports.getWarehouseDashboardStats = async (req, res) => {
    try {
        const { user_id, organization_id } = req;
        const {limit, skip, paginate = 1, sortBy, search = ''} = req.query
        let record = { count: 0 };
          const warehouseTotalCount = (await wareHouseDetails.countDocuments({warehouseOwnerId:organization_id})) ?? 0;
        
          const wareHouseActiveCount =
          (await wareHouseDetails.countDocuments({$and:[{active:true},{warehouseOwnerId:organization_id}]})) ?? 0;  

          const wareHouseInactiveCount =
          (await wareHouseDetails.countDocuments({$and:[{active:false},{warehouseOwnerId:organization_id}]})) ?? 0;  

        //   const outwardBatchCount =
        //   (await BatchOrderProcess.countDocuments({warehouseOwnerId:user_id})) ?? 0;  

       // Define query with optional search filter
let query = {
    ...(search
      ? { orderId: { $regex: search, $options: "i" }, deletedAt: null }
      : { deletedAt: null })
  };
 
  
record.rows = paginate == 1 ? await PurchaseOrderModel.find(query).select('product.name purchasedOrder.poQuantity purchasedOrder.poNo createdAt')
        .sort(sortBy)
        .skip(skip)
        .populate({ path: "distiller_id", select: "basic_details.distiller_details.organization_name " })
        //.populate({ path: "branch_id", select: "_id branchName branchId" })
        .limit(parseInt(limit)) 
        : await PurchaseOrderModel.find(query)
             
  record.rows = await Promise.all(
      record.rows.map(async (item) => {
          console.log(item._id)
          let batchOrderProcess = await BatchOrderProcess.findOne({
              warehouseOwnerId: organization_id,
              orderId: item._id,
          }).select('warehouseId orderId');

          return batchOrderProcess ? item : null; // Return the item if found, otherwise null
      })
  );
  // Filter out null values
  record.rows = record.rows.filter((item) => item !== null);
  const outwardBatchCount = record.rows.length;
        

        const warehouseDetails = await wareHouseDetails.find(
            { warehouseOwnerId: new mongoose.Types.ObjectId(organization_id) }, 
            { _id: 1 } // Only fetch `_id` field
          );
          
          const ownerwarehouseIds = warehouseDetails.map(wh => wh._id); // Extract `_id` array
            
          const inwardBatchCount =
            (await Batch.countDocuments({
              $and: [
                { warehousedetails_id: { $in: ownerwarehouseIds } },
                { wareHouse_approve_status: "Received" }
              ]
            })) ?? 0;
        
         // Total warehouse capacity
    const totalCapacityResult = await wareHouseDetails.aggregate([
        {
            $match:{_id: { $in: ownerwarehouseIds } }

        },
        {
          $group: {
            _id: null,
            totalCapacity: { $sum: "$basicDetails.warehouseCapacity" },
          },
        },
      ]);

      const totalWarehouseCapacity =
        totalCapacityResult.length > 0 ? totalCapacityResult[0].totalCapacity : 0;

        const wareHouseCount = {
            warehouseTotalCount:warehouseTotalCount,
            wareHouseActiveCount:wareHouseActiveCount,
            wareHouseInactiveCount:wareHouseInactiveCount
        }
        const records = {
          wareHouseCount,
          inwardBatchCount,
          outwardBatchCount,
          totalWarehouseCapacity
        //   realTimeStock,
        };
    
        return res.send(
          new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("Dashboard Stats"),
          })
        );
      } catch (error) {
        _handleCatchErrors(error, res);
      }
    
}

module.exports.warehouseFilterList = async (req, res) => {
    const { sortBy = 'createdAt', sortOrder = 'asc' } = req.query;

    try {
        // Decode token and get the user ID
        const token = req.headers.token || req.cookies.token;
        if (!token) {
            return res.status(401).send(new serviceResponse({ status: 401, message: "Token is required" }));
        }

        const decoded = await decryptJwtToken(token);
        const userId = decoded.data.organization_id;

        // Construct query for filtering warehouses
        const query = {
            warehouseOwnerId: userId, // Fetch only the warehouses owned by the logged-in user
        };

        // Fetch data with sorting and ensure both state_name and city are included
        const warehouses = await wareHouseDetails.find(query)
            .select("addressDetails.state.state_name addressDetails.city")
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

        // Create objects to store state_name and city in key-value pairs
        const stateNames = {};
        const cities = {};

        warehouses.forEach((warehouse) => {
            const stateName = warehouse.addressDetails.state?.state_name; // Safely access state_name
            const city = warehouse.addressDetails.city;

            if (stateName) {
                // Convert stateName to camelCase and set it in the stateNames object
                const stateKey = toCamelCase(stateName); // Convert to camelCase
                stateNames[stateKey] = stateName;
            }

            if (city) {
                // Convert city to camelCase and set it in the cities object
                const cityKey = toCamelCase(city); // Convert to camelCase
                cities[cityKey] = city;
            }
        });

        
        return res.status(200).send(new serviceResponse({
            status: 200,
            data: {
                records: {
                    state_name: stateNames,
                    city: cities,
                },
            },
            message: "Warehouses filter list fetched successfully",
        }));
    } catch (error) {
        console.error(error);
        return res.status(500).send(new serviceResponse({ status: 500, message: "Error fetching warehouses", error: error.message }));
    }
};

function toCamelCase(str) {
    return str
        .split(/[^a-zA-Z0-9]+/) // Split by spaces or special characters
        .map((word, index) => 
            index === 0 
                ? word.toLowerCase() // Lowercase the first word
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() // Capitalize subsequent words
        )
        .join(''); // Join the words back together
}















