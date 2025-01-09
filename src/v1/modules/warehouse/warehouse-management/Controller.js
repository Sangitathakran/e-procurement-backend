const mongoose = require('mongoose');
const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _query, _response_message } = require("@src/v1/utils/constants/messages");
const { Batch } = require("@src/v1/models/app/procurement/Batch");
const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { wareHouseDetails } = require("@src/v1/models/app/warehouse/warehouseDetailsSchema");
const { decryptJwtToken } = require('@src/v1/utils/helpers/jwt');
const { wareHousev2 } = require('@src/v1/models/app/warehouse/warehousev2Schema');


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
        const ownerId = decode.data.user_id; // Extract owner ID from token

        // Extract warehouse data from the request body
        const {
            basicDetails,
            addressDetails,
            documents,
            authorizedPerson,
            bankDetails,
            servicePricing,
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

        // Create a new warehouse record
        const warehouse = new wareHouseDetails({
            warehouseOwnerId: ownerId,
            basicDetails,
            addressDetails,
            documents,
            authorizedPerson: authorizedPerson,
            bankDetails,
            servicePricing: Array.isArray(servicePricing) ? servicePricing : [],
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

module.exports.getWarehouseList = asyncErrorHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'asc',
        isExport = 0
    } = req.query;

    const { warehouseIds } = req.body; // Get selected warehouse IDs from the request body

    try {
        // Decode token and get the user ID
        const token = req.headers.token || req.cookies.token;
        if (!token) {
            return res.status(401).send(new serviceResponse({ status: 401, message: "Token is required" }));
        }

        const decoded = await decryptJwtToken(token);
        const userId = decoded.data.user_id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send(new serviceResponse({ status: 400, message: "Invalid token user ID" }));
        }

        // Construct query for filtering warehouses
        const query = {
            warehouseOwnerId: userId, // Fetch only the warehouses owned by the logged-in user
            ...(search && {
                $or: [
                    { "basicDetails.warehouseName": { $regex: search, $options: 'i' } },
                    { "addressDetails.city": { $regex: search, $options: 'i' } },
                    { "addressDetails.state": { $regex: search, $options: 'i' } },
                ]
            }),
            ...(warehouseIds && { _id: { $in: warehouseIds } }) // Filter by selected warehouse IDs
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
                "Warehouse ID": item._id,
                "Warehouse Name": item.basicDetails?.warehouseName || 'NA',
                "City": item.addressDetails?.city || 'NA',
                "State": item.addressDetails?.state || 'NA',
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
});

module.exports.editWarehouseDetails = async (req, res) => {
    try {
        const getToken = req.headers.token || req.cookies.token;
        if (!getToken) {
            return res.status(200).send(new serviceResponse({ status: 401, message: _middleware.require('token') }));
        }
        const decode = await decryptJwtToken(getToken);
        const UserId = decode.data.user_id;

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








