const { _handleCatchErrors, _generateFarmerCode, getStateId, getDistrictId, parseDate } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { StateDistrictCity } = require("@src/v1/models/master/StateDistrictCity");
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
             const dob = await parseDate(date_of_birth);

            try {
                let farmerRecord = await farmer.findOne({ 'proof.aadhar_no': aadhar_no });
                if (farmerRecord) {
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
                } else {
                    const farmerCode = await _generateFarmerCode();
                    farmerRecord = new farmer({
                        associate_id: '64d2fa26b4a5b61c4e769b72', 
                        farmer_code: farmerCode, 
                        title,
                        name,
                        parents: { father_name, mother_name },
                        dob: new Date(date_of_birth),
                        gender,
                        marital_status,
                        religion,
                        category,
                        education: { highest_edu, edu_details },
                        proof: { type: id_proof_type, doc: null, aadhar_no: aadhar_no },
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