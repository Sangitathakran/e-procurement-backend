const { errorLogger } = require("@config/logger")
const { sendResponse } = require("./api_response")
const fs = require('fs');
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const moment = require("moment");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
const stateList = require("@src/v1/utils/constants/stateList");
const { ObjectId } = require('mongodb');
const ExcelJS = require('exceljs');
const { Console } = require("console");
const PDFDocument = require('pdfkit');
const FileCounter = require("@src/v1/models/app/payment/fileCounter");
/**
 * 
 * @param {any} error 
 * @param {any} res 
 * @param {import("express").NextFunction} next 
 */
exports._handleCatchErrors = async (error, res, next) => {
  console.log('error', error)
  //  errorLogger.error({ message: error.message, stack: error.stack }) 
  return res.status(500).json({ status: 500, errors: [{ message: error.message, stack: error.stack }] })
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
    return sendResponse({ res, status: 500, errors: [{ message: `${error.message}` }] });
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

// start to sangita code

exports.dumpJSONToPdf = (req, res, config = {
  data: [],
  fileName: 'Default.pdf',
  sheetName: 'Sheet1',
}) => {

  const { data, fileName, sheetName } = config;

  // Create a new PDF document
  const doc = new PDFDocument();

  // Set headers to prompt the user for download
  res.setHeader('Content-Disposition', 'attachment; filename=data.pdf');
  res.setHeader('Content-Type', 'application/pdf');

  // Pipe the document to the response
  doc.pipe(res);

  // Add content to the PDF
  doc.fontSize(20).text(data[0]?.name, { align: 'center' });
  doc.moveDown().fontSize(12).text(data[0]?.reqNo);
  doc.moveDown().fontSize(12).text(data[0]?.name);
  doc.moveDown().fontSize(12).text(data[0]?.commodityImage);
  doc.moveDown().fontSize(12).text(data[0]?.grade);
  doc.moveDown().fontSize(12).text(data[0]?.qantity);
  doc.moveDown().fontSize(12).text(data[0]?.quotedPrice);
  doc.moveDown().fontSize(12).text(data[0]?.deliveryDate);
  doc.moveDown().fontSize(12).text(data[0]?.status);
  doc.moveDown().fontSize(12).text(data[0]?.precurement_expenses);
  doc.moveDown().fontSize(12).text(data[0]?.storage_expenses);
  doc.moveDown().fontSize(12).text(data[0]?.driage);
  doc.moveDown().fontSize(12).text(data[0]?.commission);


  // Finalize the PDF
  doc.end();
};
// end of sangita code


exports._generateOrderNumber = () => {
  const min = 100000;
  const max = 999999;
  const orderNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return orderNumber.toString(); // Convert it to a string if needed
}


exports._addDays = (days) => {
  const today = moment()
  return today.add(days, 'days')
}

const farmerIdGenerator = async (obj) => {
  try {
    // get the state district date from our db
    const stateDistrictList = await StateDistrictCity.findOne({})

    // find the state
    const stateData = stateDistrictList.states.find(
      (item) => item.state_title.toLowerCase() === obj.address.state.toLowerCase()
    );
    if (!stateData) {
      throw new Error(`State not found for ${obj.address.state}`);
    }

    // find the district in the state 
    const district = stateData.districts.find(
      (item) => item.district_title.toLowerCase() === obj.address.district.toLowerCase()
    );
    if (!district) {
      throw new Error(`District not found for ${obj.address.district}`);
    }

    const stateCode = stateData.state_code;
    const districtSerialNumber = district.serialNumber;
    const farmerMongoId = obj._id.toString().slice(-3).toUpperCase();
    const randomNumber = Math.floor(100 + Math.random() * 900);

    const farmerId = `${stateCode}${districtSerialNumber}${farmerMongoId}${randomNumber}`;
    return farmerId;

  } catch (error) {
    console.error('Error generating farmer ID:', error.message);
    throw error;
  }
};

exports.generateFarmerId = async (obj) => {
  let farmerId;

  while (true) {
    farmerId = await farmerIdGenerator(obj);
    const existingFarmer = await farmer.findOne({ farmer_id: farmerId });
    if (!existingFarmer) {
      return farmerId;
    }
  }
};

exports.generateFileName = async (clientCode) => {

  const newDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  let [day, month, year] = newDate.split(",")[0].split("/");
  day = day.padStart(2, '0');
  month = month.padStart(2, '0');
  const finalDate = `${day}${month}${year.slice(2)}`;

  const currentDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }).split(",")[0];
  let counterDoc = await FileCounter.findOne({ date: currentDate });

  if (!counterDoc) {
    counterDoc = await FileCounter.create({
      date: currentDate,
      count: [1]
    })
  }

  let runningNumber = counterDoc.count.length > 0 ? Math.max(...counterDoc.count) : 1;
  await FileCounter.updateOne({ _id: counterDoc._id }, { $push: { count: runningNumber + 1 } });

  const lastFiveLetters = clientCode.slice(-5).toUpperCase();
  const formattedRunningNumber = String(runningNumber).padStart(3, '0');

  const fileName = `${lastFiveLetters}${finalDate}${formattedRunningNumber}.csv`;

  return fileName
}

exports.isStateAvailable = async (state) => {
  const stateDistrictList = await StateDistrictCity.findOne({})
  const isAvailable = stateDistrictList.states.find(item => item.state_title === state)
  return isAvailable ? true : false
}

exports.isDistrictAvailable = async (state, district) => {
  const stateDistrictList = await StateDistrictCity.findOne({})
  const stateItem = stateDistrictList.states.find(item => item.state_title === state)
  const isDistrictAvailable = stateItem.districts.find(item => item.district_title === district)
  return isDistrictAvailable ? true : false
}


// to update the district in district array in particular state in "stateDistrictCity" collection 
exports.updateDistrict = async (state, district) => {

  const stateDistrictList = await StateDistrictCity.findOne({})
  stateDistrictList.states.forEach(state => {

    if (state.state_title === state) {

      const districtCount = state.districts.length
      const serialNumber = districtCount < 10 ? `0${districtCount + 1}` : `${districtCount + 1}`;

      const districtPayload = {
        district_title: district.trim(),
        serialNumber: serialNumber
      }

      state.districts.push(districtPayload)

    }

  })

  await stateDistrictList.save()
}


exports.getState = async (stateId) => {
  const state = await StateDistrictCity.aggregate([
    {
      $match: { "states._id": new ObjectId(stateId) } // Match the state by stateId
    },
    {
      $project: {
        _id: 0,
        state: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: "$states", // Access the states array
                    as: "stateItem",
                    cond: { $eq: ["$$stateItem._id", new ObjectId(stateId)] } // Filter by the stateId
                  }
                },
                as: "filteredState",
                in: {
                  state_title: "$$filteredState.state_title", // Retrieve the state title
                  state_code: "$$filteredState.state_code",   // Retrieve the state code
                  status: "$$filteredState.status"           // Retrieve the status if needed
                }
              }
            },
            0
          ]
        }
      }
    }
  ]);

  if (state.length === 0 || !state[0].state) {
    throw new Error("State not found");
  }

  return state[0].state; // Return the state object
};

exports.getDistrict = async (districtId) => {
  const district = await StateDistrictCity.aggregate([
    {
      $match: { "states.districts._id": new ObjectId(districtId) }  // Match based on districtId
    },
    {
      $project: {
        _id: 0,
        district: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: {
                      $reduce: {
                        input: "$states",  // Access all states
                        initialValue: [],
                        in: { $concatArrays: ["$$value", "$$this.districts"] }  // Extract districts from all states
                      }
                    },
                    as: "districtItem",
                    cond: { $eq: ["$$districtItem._id", new ObjectId(districtId)] }  // Match district ID
                  }
                },
                as: "filteredDistrict",
                in: {
                  district_title: "$$filteredDistrict.district_title",  // Retrieve district title
                  status: "$$filteredDistrict.status"                   // Retrieve status if needed
                }
              }
            },
            0
          ]
        }
      }
    }
  ]);

  if (district.length === 0 || !district[0].district) {

    throw new Error("District not found");
  }

  return district[0].district; // Return the district object
};


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
      const state = stateDoc.states.find(state => state.state_title == stateName);
      // console.log('state', state._id);
      if (state) {
        myAddress.set(stateName, state._id);
        return state._id;
      }
    }
    throw new Error(`Farmer State Name Not Found: ${stateName}`);
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
        // console.log('state', district._id);
        if (district) {
          myAddress.set(districtName, district._id)
          return district._id;
        }
      }
    }
    throw new Error(`Farmer District Name Not Found: ${districtName}`);
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

exports.calculateAge = (birthdate) => {
  const birthDate = new Date(birthdate);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

exports.handleDecimal = (value) => {
  return parseFloat(value) < 0 ? 0 : parseFloat(parseFloat(value).toFixed(3));
}

exports._taxValue = () => {
  const tax = 0;
  return tax;
}

exports._distillerMsp = () => {
  const msp = 24470;
  return msp;
}
exports._mandiTax = (amount) => {
  
 const tax =  (amount * 1.2) / 100;
  return tax;
}

exports.formatDate = (timestamp, format = "DD/MM/YYYY") => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);

  // Extract day, month, and year
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
exports.makeSearchQuery = (searchFields,search) => ({
  $or: searchFields.map(item => ({
      [item]: { $regex: search, $options: 'i' }
  }))
});