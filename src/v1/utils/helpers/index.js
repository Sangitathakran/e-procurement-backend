const { errorLogger } = require("@config/logger")
const { serviceResponse } = require("./api_response")
const fs = require('fs');
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const moment = require("moment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
/**
 * 
 * @param {any} error 
 * @param {any} res 
 * @param {import("express").NextFunction} next 
 */
exports._handleCatchErrors = async (error, res, next) => {
    // errorLogger.error({ message: error.message, stack: error.stack }) 
    return res.status(500).send(new serviceResponse({ status: 500, errors: [{ message: error.message, stack: error.stack }] }))
}


exports.dumpJSONToCSV = (req, res, config = {
    data: [],
    fileName: 'Default CSV',
    columnNames: [],
}) => {
    try {
        const filename = config.fileName;
        const json2csvParser = new Parser({ fields: config.columnNames });
        const csv = json2csvParser.parse(config.data);

        fs.writeFileSync(filename, csv);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader('Content-Type', 'text/csv');

        const fileStream = fs.createReadStream(filename);

        fileStream.pipe(res);

        fileStream.on('end', () => {
            fs.unlinkSync(filename);
        });


    } catch (error) {
        return res.status(200).send(new serviceResponse({ status: 500, errors: [{ message: `${error.message}` }] }));
    }
};


exports.dumpJSONToExcel = (req, res, config = {
    data: [],
    fileName: 'Default.xlsx',
    sheetName: 'Sheet1',
}) => {
    try {
        const { data, fileName, sheetName } = config;

        // Convert JSON data to worksheet
        const ws = xlsx.utils.json_to_sheet(data);

        // Create a new workbook and add the worksheet to it
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, sheetName);

        // Write the workbook to a file
        xlsx.writeFile(wb, fileName);

        // Set response headers
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Create a read stream from the file and pipe it to the response
        const fileStream = fs.createReadStream(fileName);
        fileStream.pipe(res);

        fileStream.on('end', () => {
            fs.unlinkSync(fileName); // Delete the file after sending the response
        });

    } catch (error) {
        return res.status(500).send({
            status: 500,
            errors: [{ message: `${error.message}` }]
        });
    }
};


exports._generateOrderNumber = () => {
    const uuid = uuidv4();
    const shortOrderNumber = uuid.replace(/-/g, '').substring(0, 6); // Remove dashes and take the first 6 characters
    return shortOrderNumber;
}


exports._addDays = (days) => {
    const today = moment()
    return today.add(days, 'days')
}

// farmerCodeGenerator.js

exports._generateFarmerCode = async () => {
    const prefix = 'FA';
    let uniqueId;
    let farmerCode;
    let existingFarmer;

    try {
        do {
            uniqueId = Math.floor(Math.random() * 900000) + 100000;
            farmerCode = `${prefix}${uniqueId}`;
            existingFarmer = await farmer.findOne({ farmer_code: farmerCode });
        } while (existingFarmer);

        return farmerCode;
    } catch (error) {
        console.error('Error generating Farmer Code:', error);
        throw new Error('Could not generate a unique Farmer Code');
    }
}
const myAddress = new Map()
exports.getStateId = async (stateName) => {
    try {
        if (myAddress.get(stateName)) {
            return myAddress.get(stateName)
        }
        const stateDoc = await StateDistrictCity.findOne({
            'states.state_title': stateName
        });
        if (stateDoc) {
            const state = stateDoc.states.find(state => state.state_title === stateName);
            if (state)
                myAddress.set(stateName, state._id)
            return state ? state._id : null;
        } else {
            return null;
        }
    } catch (error) {
        throw new Error(`Error fetching state ID: ${error.message}`);
    }
};

exports.getDistrictId = async (districtName) => {
    try {
        if (myAddress.get(districtName)) {
            return myAddress.get(districtName)
        }
        const stateDoc = await StateDistrictCity.findOne({
            'states.districts.district_title': districtName
        });

        if (stateDoc) {
            for (const state of stateDoc.states) {
                const district = state.districts.find(district => district.district_title === districtName);
                if (district) {
                    myAddress.set(districtName, district._id)
                    return district._id;
                }
            }
        }
        return null;
    } catch (error) {
        throw new Error(`Error fetching district ID: ${error.message}`);
    }
};
exports.parseDate = async (dateString) => {
    return moment(dateString, 'DD-MM-YYYY').toDate();;
};

exports.parseMonthyear = (dateString) => {
    const [month, year] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
}
