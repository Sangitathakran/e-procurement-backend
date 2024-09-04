const { _handleCatchErrors, _generateFarmerCode } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const {  _response_message } = require("@src/v1/utils/constants/messages");

module.exports.createFarmer = async (req, res) => {
    try {
        const {
            associate_id,
            title,
            name,
            parents,
            dob,
            gender,
            marital_status,
            religion,
            category,
            education,
            proof,
            address,
            mobile_no,
            email,
            status
        } = req.body;
        const { father_name, mother_name } = parents || {};
        const existingFarmer = await farmer.findOne({ 'mobile_no': mobile_no });

        if (existingFarmer) {
            return res.status(400).send(new serviceResponse({
                status: 400,
                errors: [{ message: _response_message.allReadyExist("farmer") }]
            }));
        }
        const farmerCode = await _generateFarmerCode();
        console.log(farmerCode);
        
        const newFarmer = new farmer({
            associate_id,
            farmer_code:farmerCode,
            title,
            name,
            parents: {
                father_name: father_name || '',
                mother_name: mother_name || ''  
            },
            dob,
            gender,
            marital_status,
            religion,
            category,
            education,
            proof,
            address,
            mobile_no,
            email,
            status
        });
        const savedFarmer = await newFarmer.save();

        return res.status(201).send(new serviceResponse({
            status: 201,
            data: savedFarmer,
            message: _response_message.created("Farmer")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};

module.exports.bulkUploadFarmers = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: responseMessage.no_file_upload,
            status: 400
        });
    }

    try {
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const fileExtension = path.extname(originalName).toLowerCase();

        let farmers = [];

        if (fileExtension === '.csv') {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (row) => {
                    farmers.push(row);
                })
                .on('end', async () => {
                    await saveFarmers(farmers, res);
                })
                .on('error', (err) => {
                    return res.status(500).json({
                        message: responseMessage.error_parsing_csv,
                        status: 500,
                        error: err.message
                    });
                });
        } else if (fileExtension === '.xlsx') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            farmers = XLSX.utils.sheet_to_json(sheet);
            await saveFarmers(farmers, res);
        } else {
            return res.status(400).json({
                message: responseMessage.invalid_file_type,
                status: 400
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message,
            status: 500,
            error: err.message
        });
    }
};

async function saveFarmers(farmers, res) {
    try {
        for (let farmerData of farmers) {
            if (farmerData['DATE OF BIRTH(DD/MM/YYYY)*']) {
                farmerData['DATE OF BIRTH(DD/MM/YYYY)*'] = parseDate(farmerData['DATE OF BIRTH(DD/MM/YYYY)*']);
            }
            if (farmerData['SOWING DATE(MM/YYYY)*']) {
                farmerData['SOWING DATE(MM/YYYY)*'] = parseMonthYear(farmerData['SOWING DATE(MM/YYYY)*']);
            }
            if (farmerData['HARVESTING DATE(MM/YYYY)*']) {
                farmerData['HARVESTING DATE(MM/YYYY)*'] = parseMonthYear(farmerData['HARVESTING DATE(MM/YYYY)*']);
            }

            const {
                "FPO NAME*": fpo_name,
                "TITLE": title,
                "NAME*": name,
                "FATHER NAME*": father_name,
                "MOTHER NAME": mother_name,
                "DATE OF BIRTH(DD/MM/YYYY)*": date_of_birth,
                "GENDER*": gender,
                "MARITAL STATUS": marital_status,
                "RELIGION": religion,
                "CATEGORY": category,
                "EDUCATION LEVEL": education_level,
                "EDU DETAILS": edu_details,
                "ID PROOF TYPE": id_proof_type,
                "AADHAR NUMBER*": adhar_number,
                "ADDRESS LINE*": address_line,
                "STATE NAME*": state_name,
                "DISTRICT NAME*": district_name,
                "BLOCK NAME": block_name,
                "VILLAGE NAME": village_name,
                "PINCODE": pincode,
                "MOBILE NO*": mobile_no,
                "EMAIL ID": email_id,
                "TOTAL AREA*": total_area,
                "AREA UNIT*": area_unit,
                "KHASRA NUMBER*": khasra_number,
                "SOIL TYPE*": soil_type,
                "CROPS NAME*": crops_name,
                "PRODUCTION QUANTITY*": production_quantity,
                "CROP SEASONS*": crop_seasons,
            } = farmerData;

            // Validate required fields
            const requiredFields = [
                { field: fpo_name, name: 'FPO Name' },
                { field: name, name: 'Name' },
                { field: father_name, name: 'Father name' },
                { field: date_of_birth, name: 'Date of birth' },
                { field: gender, name: 'Gender' },
                { field: address_line, name: 'Address' },
                { field: mobile_no, name: 'Mobile number' },
                { field: adhar_number, name: 'Aadhar number' },
                { field: total_area, name: 'Total area' },
                { field: area_unit, name: 'Area Unit' },
                { field: khasra_number, name: 'Khasra number' },
                { field: soil_type, name: 'Soil type' },
                { field: crops_name, name: 'Crop Name' },
                { field: production_quantity, name: 'Production Quantity' },
                { field: crop_seasons, name: 'Crop seasons' }
            ];

            for (let { field, name } of requiredFields) {
                if (!field) {
                    return res.status(400).json({
                        message: responseMessage.required(name),
                        status: 400
                    });
                }
            }

            // Validate mobile number
            if (!/^\d{10}$/.test(mobile_no)) {
                return res.status(400).json({
                    message: responseMessage.mobile_no_tendigits,
                    status: 400
                });
            }

            // Validate Aadhar number
            if (!/^\d{12}$/.test(adhar_number)) {
                return res.status(400).json({
                    message: responseMessage.aadhar_card_number_pattern,
                    status: 400
                });
            }

            // Check if the farmer already exists
            const existingFarmer = await farmer.findOne({ 'proof.aadhar_no': adhar_number });
            if (existingFarmer) {
                return res.status(200).json({
                    message: responseMessage.farmer_adhar_not_found,
                    status: 200
                });
            }

            // Find FPO by name
            const fpo = await UserModel.findOne({ business_name: fpo_name });
            if (!fpo) {
                return res.status(200).json({
                    message: responseMessage.fpo_not_found,
                    status: 200
                });
            }
            const fpo_id = fpo._id;

            // Find State and District by name
            const state = await stateDistrictCityModel.findOne(
                { "states.state_title": state_name },
                { "states.$": 1 } 
            );
            if (!state) {
                return res.status(200).json({
                    message: `State Name Not Found: ${state_name}`,
                    status: 200
                });
            }
            const state_id = state.states[0]._id;

            const district = state.states.find(s => s.state_title === state_name).districts.find(d => d.district_title === district_name);
            if (!district) {
                return res.status(200).json({
                    message: `District not found: ${district_name}`,
                    status: 200
                });
            }
            const district_id = district._id;

            // Create and save the farmer
            const newFarmer = new farmer({
                associate_id: fpo_id,
                farmer_code: '', // Assuming this is generated elsewhere
                title,
                name,
                parents: {
                    father_name,
                    mother_name
                },
                dob: date_of_birth,
                gender,
                marital_status,
                religion,
                category,
                education: {
                    highest_edu: education_level,
                    edu_details
                },
                proof: {
                    type: id_proof_type,
                    doc: '', // Assuming this is set elsewhere
                    aadhar_no: adhar_number,
                },
                address: {
                    address_line,
                    state: state_id,
                    district: district_id,
                    block: block_name,
                    village: village_name,
                    pinCode: pincode,
                },
                mobile_no,
                email: email_id,
                status: 'active', // Default status
            });

            await newFarmer.save();
        }

        return res.status(201).json({
            message: responseMessage.bulk_upload_success,
            status: 201
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
            status: 500,
            error: err.message
        });
    }
}