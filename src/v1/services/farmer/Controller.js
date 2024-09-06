const { _handleCatchErrors, _generateFarmerCode, getStateId, getDistrictId, parseDate } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { Land } = require("@src/v1/models/app/farmerDetails/Land");
const { User } = require("@src/v1/models/app/auth/User");
const {  _response_message } = require("@src/v1/utils/constants/messages");
const xlsx = require('xlsx');
const csv = require("csv-parser");
const Readable = require('stream').Readable; 

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
module.exports.getFarmers = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'name', search = '', paginate = 1 } = req.query;
        const skip = (page - 1) * limit;

        const query = search ? { name: { $regex: search, $options: 'i' } } : {};

        const records = { count: 0 };
        records.rows = paginate == 1 
            ? await farmer.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort(sortBy) 
            : await farmer.find(query).sort(sortBy);

        records.count = await farmer.countDocuments(query);

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
        }

        return res.status(200).send(new serviceResponse({
            status: 200,
            data: records,
            message: _response_message.found("farmers")
        }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};


module.exports.bulkUploadFarmers = async (req, res) => {
    try {
        const { isxlsx = 1 } = req.body;
        const [file] = req.files;
        if (!file) {
            return res.status(400).json({
                message: _response_message.notFound("file"),
                status: 400
            });
        }

        let farmers = [];
        let headers = [];

        if (isxlsx) {
            const workbook = xlsx.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            farmers = xlsx.utils.sheet_to_json(worksheet);
            headers = Object.keys(farmers[0]);
        } else {
            const csvContent = file.buffer.toString('utf8');
            const lines = csvContent.split('\n');
            headers = lines[0].trim().split(',');
            const dataContent = lines.slice(1).join('\n');

            const parser = csv({ headers });
            parser.on('data', (data) => {
                if (Object.values(data).some(val => val !== '')) {
                    farmers.push(data);
                }
            });

            const readableStream = Readable.from(dataContent);
            readableStream.pipe(parser);

            await new Promise((resolve, reject) => {
                parser.on('end', resolve);
                parser.on('error', reject);
            });
        }

        let errorArray = [];

        const processFarmerRecord = async (rec) => {
            const fpo_name = rec["FPO NAME*"];
            const title = rec["TITLE"];
            const name = rec["NAME*"];
            const father_name = rec["FATHER NAME*"];
            const mother_name = rec["MOTHER NAME"];
            const date_of_birth = rec["DATE OF BIRTH(DD/MM/YYYY)*"];
            const gender = rec["GENDER*"];
            const marital_status = rec["MARITAL STATUS"];
            const religion = rec["RELIGION"];
            const category = rec["CATEGORY"];
            const highest_edu = rec["EDUCATION LEVEL"];
            const edu_details = rec["EDU DETAILS"];
            const id_proof_type = rec["ID PROOF TYPE"];
            const aadhar_no = rec["AADHAR NUMBER*"];
            const type_of_alternate_id = rec["TYPE OF ALTERNATE ID"];
            const address_line = rec["ADDRESS LINE*"];
            const state_name = rec["STATE NAME*"];
            const district_name = rec["DISTRICT NAME*"];
            const block_name = rec["BLOCK NAME"];
            const village_name = rec["VILLAGE NAME"];
            const pincode = rec["PINCODE"];
            const mobile_no = rec["MOBILE NO*"];
            const email_id = rec["EMAIL ID"];
            const total_area = rec["TOTAL AREA"];
            const area_unit = rec["AREA UNIT"];
            const khasra_no = rec["KHASRA NUMBER"];
            const khatauni = rec["KHATAUNI"];
            const sow_area = rec["SOW AREA"];
            const state = rec["STATE"];
            const district = rec["DISTRICT"];
            const sub_district = rec["SUB DISTRICT"];
            const village = rec["VILLAGE"];
            const pinCode = rec["PINCODE"];
            const expected_production = rec["EXPECTED PRODUCTION"];
            const soil_type = rec["SOIL TYPE"];
            const soil_tested = rec["SOIL TESTED"];
            const soil_health_card = rec["SOIL HEALTH CARD"];
            const soil_testing_lab_name = rec["SOIL TESTING LAB NAME"];
            const lab_distance_unit = rec["LAB DISTANCE UNIT"];
            let errors = [];
            if (!fpo_name || !name || !father_name || !date_of_birth || !gender || !aadhar_no || !address_line || !state_name || !district_name || !mobile_no) {
                errors.push({ record: rec, error: "Required fields missing" });
            }
            if (!/^\d{12}$/.test(aadhar_no)) {
                errors.push({ record: rec, error: "Invalid Aadhar Number" });
            }
            if (!/^\d{10}$/.test(mobile_no)) {
                errors.push({ record: rec, error: "Invalid Mobile Number" });
            }

            if (errors.length > 0) {
                return { success: false, errors };
            }
             const state_id = await getStateId(state_name);
             const district_id = await getDistrictId(district_name);
             const land_state_id = await getStateId(state);
            const land_district_id = await getDistrictId(district);
             const dob = await parseDate(date_of_birth);
             const associate = await User.findOne({ 'basic_details.associate_details.organization_name': fpo_name });
             const associateId = associate ? associate._id : null;

            try {
                let farmerRecord = await farmer.findOne({ 'proof.aadhar_no': aadhar_no });
                
                if (farmerRecord) {
                    farmerRecord.associate_id = associateId;
                    farmerRecord.title = title;
                    farmerRecord.name = name;
                    farmerRecord.parents.father_name = father_name;
                    farmerRecord.parents.mother_name = mother_name;
                    farmerRecord.dob = dob;
                    farmerRecord.gender = gender;
                    farmerRecord.marital_status = marital_status;
                    farmerRecord.religion = religion;
                    farmerRecord.category = category;
                    farmerRecord.education.highest_edu = highest_edu;
                    farmerRecord.education.edu_details = edu_details;
                    farmerRecord.proof.type = id_proof_type;
                    farmerRecord.proof.aadhar_no = aadhar_no;
                    farmerRecord.address.address_line = address_line;
                    farmerRecord.address.state_id = state_id;
                    farmerRecord.address.district_id = district_id;
                    farmerRecord.address.block = block_name;
                    farmerRecord.address.village = village_name;
                    farmerRecord.address.pinCode = pincode;
                    farmerRecord.mobile_no = mobile_no;
                    farmerRecord.email_id = email_id;
                    await farmerRecord.save();
                    let landRecord = await Land.findOne({ farmer_id: farmerRecord.id });
                    landRecord.farmer_id = farmerRecord._id;
                    landRecord.associate_id = associateId;
                    landRecord.total_area = total_area;
                    landRecord.khasra_no = khasra_no;
                    landRecord.area_unit = area_unit;
                    landRecord.khatauni = khatauni;
                    landRecord.sow_area = sow_area;
                    landRecord.land_address = {
                        state_id:state_id,
                        district_id:district_id,
                        sub_district,
                        village,
                        pinCode
                    };
                    landRecord.expected_production = expected_production;
                    landRecord.soil_type = soil_type;
                    landRecord.soil_tested = soil_tested;
                    landRecord.soil_health_card = soil_health_card;
                    landRecord.soil_testing_lab_name = soil_testing_lab_name;
                    landRecord.lab_distance_unit = lab_distance_unit;
                    await landRecord.save();
                } else {
                    const farmerCode = await _generateFarmerCode();
                    farmerRecord = new farmer({
                        associate_id: associateId, 
                        farmer_code: farmerCode, 
                        title,
                        name,
                        parents: { father_name, mother_name },
                        dob,
                        gender,
                        marital_status,
                        religion,
                        category,
                        education: { highest_edu, edu_details },
                        proof: { type: id_proof_type, aadhar_no: aadhar_no },
                        address: {
                            address_line,
                            state_id,
                            district_id,
                            block: block_name,
                            village: village_name,
                            pinCode: pincode
                        },
                        mobile_no,
                        email_id
                    });
                    await farmerRecord.save();
                    const newLand = new Land({
                        farmer_id: farmerRecord._id,
                        associate_id:associateId,
                        total_area,
                        area_unit,
                        khasra_no,
                        khatauni,
                        sow_area,
                        land_address: { land_state_id, land_district_id, sub_district, village, pinCode },
                        expected_production,
                        soil_type,
                        soil_tested,
                        soil_health_card,
                        soil_testing_lab_name,
                        lab_distance_unit,
                }); 
                await newLand.save();
            }
            } catch (error) {
                errors.push({ record: rec, error: error.message });
            }
            return { success: errors.length === 0, errors };
        };

        for (const farmer of farmers) {
            const result = await processFarmerRecord(farmer);
            if (!result.success) {
                errorArray = errorArray.concat(result.errors);
            }
        }

        if (errorArray.length > 0) {
            return res.status(200).send(new serviceResponse({
                status: 400,
                data: { records: errorArray },
                errors: [{ message: "Partial upload successful. Please check the error records." }]
            }));
        } else {
            return res.status(200).send(new serviceResponse({
                status: 200,
                data: {},
                message: "Farmers successfully uploaded."
            }));
        }

    } catch (error) {
        _handleCatchErrors(error, res);
    }
};