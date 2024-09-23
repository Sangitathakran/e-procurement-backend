const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");


const {wareHouse} = require('@src/v1/models/app/warehouse/warehouseSchema');

module.exports.warehousedata = async(req, res) => {
    try {
        const {warehouseId, warehouseName, ownerName, authorized_personName, pointOfContact, warehouseCapacity} = req.body;

        const warehousedetails = await wareHouse.create({warehouseId, warehouseName, ownerName, authorized_personName, pointOfContact, warehouseCapacity });

        return sendResponse({
            res,
            status: 200,
            data: warehousedetails,
            message: _response_message.created("warehouse")
        });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.warehouseList = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'warehouseName', search = '', isExport = 0 } = req.query;
        const skip = (page - 1) * limit;
        const searchFields = ['warehouseName', 'warehouseId', 'ownerName', 'authorized_personName', 'pointOfContact.name']

        const makeSearchQuery = (searchFields) => { 
            let query = {}
            query['$or'] =  searchFields.map(item=> ({ [item] : { $regex: search, $options: 'i' } }))
            return query
        }

        const query = search ? makeSearchQuery(searchFields) : {}
        const records = { count: 0, rows:[] };

        //warehouse list
        records.rows.push(...await wareHouse.find(query)
                                                .select('warehouseId warehouseName ownerName authorized_personName pointOfContact warehouseCapacity')
                                                .limit(parseInt(limit))
                                                .skip(parseInt(skip))
                                                .sort(sortBy)
                                             )

        
        records.count = await wareHouse.countDocuments(query);
        records.page = page;
        records.limit = limit;
        records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;

        if(isExport==1){

            const record = records.rows.map((item) => {
                                    
                return {
                    "Warehouse ID": item?.warehouseId || 'NA',
                    "WareHouse Name": item?.warehouseName || 'NA',
                    "Owner Name": item?.ownerName || 'NA',
                    "Authorized Person": item?.authorized_personName ?? 'NA',
                    "POC Name": item?.pointOfContact.name ?? 'NA',
                    "POC Email": item?.pointOfContact.email ?? 'NA',
                    "POC Phone": item?.pointOfContact.phone ?? 'NA',
                    "WarehouseCapacity": item?.warehouseCapacity  ?? 'NA',
                }

                
            })
            if(record.length>0){
                dumpJSONToExcel(req, res, {
                    data: record,
                    fileName: `warehouse-List.xlsx`,
                    worksheetName: `warehouse-List`
                });
            }
            else {
                return sendResponse({
                    res,
                    status: 200,
                    data: records,
                    message: _response_message.found("warehouse")
                });
            }
        }
        else{ 
            return sendResponse({
                res,
                status: 200,
                data: records,
                message: _response_message.found("warehouse")
            });
        }
    }catch (error) {
        _handleCatchErrors(error, res);
    }
};
