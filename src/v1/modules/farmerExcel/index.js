const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const { getDistrictTitleById } = require('./getdistrict'); // Import the function to get district title
// MongoDB URI
const MONGO_URI = 'mongodb+srv://support:iltND7XMeZ0BuVPH@cluster0.69znerk.mongodb.net/procurement-prod';

// Mongoose connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('✅ MongoDB connected');
        exportFarmersToCSV(); // Call the function after DB connects
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Define schema (strict: false for flexible structure)
const farmerSchema = new mongoose.Schema({}, { strict: false });
const Farmer = mongoose.model('farmers_nccf', farmerSchema, 'farmers_nccf');

const BATCH_SIZE = 10000;
const OUTPUT_FILE = path.join(__dirname, 'farmers.csv');

// Export logic in a function
async function exportFarmersToCSV() {
    try {
        const total = await Farmer.countDocuments();
        console.log(`📦 Total records: ${total}`);

        fs.writeFileSync(OUTPUT_FILE, ''); // Clear file at start

        const csvWriter = createObjectCsvWriter({
            path: OUTPUT_FILE,
            header: [
                { id: 'farmer_id', title: 'Farmer Id' },
                { id: 'name', title: 'Farmer Name' },
                { id: 'mobile_no', title: 'Mobile Number' },
                { id: 'gender', title: 'Gender' },
                { id: 'state', title: 'Farmer State' },
                { id: 'district', title: 'Farmer District' },
                { id: 'category', title: 'Caste Category' },
                { id: 'account_no', title: 'Account No' },
                { id: 'ifsc_code', title: 'Ifsc Code' },
                { id: 'bank_name', title: 'Bank Name' },
                , { id: 'branch_name', title: 'Branch Name' },
                { id: 'associate_name', title: 'Associate Name' },
                { id: 'scheme_status', title: 'Scheme Status' },
                { id: 'source_by', title: 'Source' }
            ],
            append: false
        });

        let skip = 0;
        let batch = 1;

        while (skip < total) {
            console.log(`⏳ Batch ${batch}: ${skip} to ${Math.min(skip + BATCH_SIZE, total)}`);

            const farmers = await Farmer.aggregate([
                { $match: { $in: ["6719f065845487ff168da8ee", "6719f065845487ff168daa77"] } },
                { $skip: skip },
                { $limit: BATCH_SIZE },


                {
                    $lookup: {
                        from: 'users',
                        localField: 'associate_id',
                        foreignField: '_id',
                        as: 'associate_info'
                    }
                },
                { $unwind: { path: '$associate_info', preserveNullAndEmptyArrays: true } },

                {
                    $project: {
                        farmer_id: 1,
                        name: 1,
                        gender: "$basic_details.gender",
                        mobile_no: "$basic_details.mobile_no",
                        state_id: "$address.state_id",
                        district_id: "$address.district_id",
                        category: "$basic_details.category",
                        account_no: "$bank_details.account_no",
                        ifsc_code: "$bank_details.ifsc_code",
                        bank_name: "$bank_details.bank_name",
                        branch_name: "$bank_details.branch_name",
                        source_by: 1,
                        associate_name: {
                            $ifNull: ["$associate_info.associate_details.basic_details.organization_name", "NA"]
                        }
                    }
                }
            ]);

            let stateObj = {
                // '6719f065845487ff168da08f': 'Assam',
                // '6719f065845487ff168da562': 'Haryana',
                // '6719f065845487ff168db1ae': 'Uttar Pradesh',
                '6719f065845487ff168da8ee': 'Madhya Pradesh',
                '6719f065845487ff168daa77': 'Maharashtra'
            }

            // const districtMap = {
            //     "6719f065845487ff168db2aa": "Lucknow",
            //     "67f73a3b51dc7ca3d45dbf14": "Siddharth Nagar",
            //     "6719f065845487ff168da5b4": "Sirsa",
            //     "6719f065845487ff168da117": "Nagaon",
            //     "67a59b3bc8a7a751acb7eb4d": "Majuli",
            //     "6719f065845487ff168da090": "Baksa",
            //     "6719f065845487ff168db1cb": "Auraiya",
            //     "67f739dd51dc7ca3d45da46a": "Prayagraj",
            //     "679b05a38c4dad5fef196b02": "Charaideo",
            //     "6719f065845487ff168db23c": "Firozabad",
            //     "6719f065845487ff168db28e": "Kanpur Nagar",
            //     "6719f065845487ff168da0ff": "Kokrajhar",
            //     "6719f065845487ff168da0ce": "Golaghat",
            //     "680f4c8248f711758fe2fd10": "Lakhimpur Kheri",
            //     "6719f065845487ff168da0ac": "Darrang",
            //     "6719f065845487ff168db255": "Gorakhpur",
            //     "6719f065845487ff168da5be": "Yamuna Nagar",
            //     "6719f065845487ff168da0d5": "Hailakandi",
            //     "6719f065845487ff168db208": "Budaun",
            //     "6719f065845487ff168da595": "Kurukshetra"
            // };

            const districtMap = {
                "6719f065845487ff168da8ef": "Alirajpur",
                "6719f065845487ff168da8f3": "Anuppur",
                "6719f065845487ff168da8f8": "Ashok Nagar",
                "6719f065845487ff168da8fe": "Balaghat",
                "6719f065845487ff168da909": "Barwani",
                "6719f065845487ff168da913": "Betul",
                "6719f065845487ff168da91c": "Bhind",
                "6719f065845487ff168da925": "Bhopal",
                "6719f065845487ff168da928": "Burhanpur",
                "6719f065845487ff168da92c": "Chhatarpur",
                "6719f065845487ff168da938": "Chhindwara",
                "6719f065845487ff168da945": "Damoh",
                "6719f065845487ff168da94d": "Datia",
                "6719f065845487ff168da952": "Dewas",
                "6719f065845487ff168da95b": "Dhar",
                "6719f065845487ff168da964": "Dindori",
                "6719f065845487ff168da967": "Guna",
                "6719f065845487ff168da96f": "Gwalior",
                "6719f065845487ff168da974": "Harda",
                "6719f065845487ff168da97b": "Hoshangabad",
                "6719f065845487ff168da984": "Indore",
                "6719f065845487ff168da98a": "Jabalpur",
                "6719f065845487ff168da992": "Jhabua",
                "6719f065845487ff168da998": "Katni",
                "6719f065845487ff168da9a0": "Khandwa (East Nimar)",
                "6719f065845487ff168da9a6": "Khargone (West Nimar)",
                "6719f065845487ff168da9b0": "Mandla",
                "6719f065845487ff168da9b7": "Mandsaur",
                "6719f065845487ff168da9c0": "Morena",
                "6719f065845487ff168da9c7": "Narsinghpur",
                "6719f065845487ff168da9cd": "Neemuch",
                "6719f065845487ff168da9d3": "Panna",
                "6719f065845487ff168da9dc": "Raisen",
                "6719f065845487ff168da9e5": "Rajgarh",
                "6719f065845487ff168da9ed": "Ratlam",
                "6719f065845487ff168da9f6": "Rewa",
                "6719f065845487ff168daa02": "Sagar",
                "6719f065845487ff168daa0e": "Satna",
                "6719f065845487ff168daa19": "Sehore",
                "6719f065845487ff168daa22": "Seoni",
                "6719f065845487ff168daa2b": "Shahdol",
                "6719f065845487ff168daa30": "Shajapur",
                "6719f065845487ff168daa3a": "Sheopur",
                "6719f065845487ff168daa40": "Shivpuri",
                "6719f065845487ff168daa49": "Sidhi",
                "6719f065845487ff168daa50": "Singrauli",
                "6719f065845487ff168daa54": "Tikamgarh",
                "6719f065845487ff168daa5e": "Ujjain",
                "6719f065845487ff168daa66": "Umaria",
                "6719f065845487ff168daa6c": "Vidisha",
                "67f6499986da3b93d9b71da8": "Ashoknagar",
                "67f64a8486da3b93d9b73d5f": "Narmadapuram",
                "67f64ab586da3b93d9b75866": "Khargone",
                "680c8e6e669fad48cb48f196": "Agar Malwa",
                "680c8f32669fad48cb494e59": "Niwari",
                "680f5ead48f711758fe7e178": "East Nimar",
                "6719f065845487ff168daa78": "Ahmed Nagar",
                "6719f065845487ff168daa87": "Akola",
                "6719f065845487ff168daa8f": "Amravati",
                "6719f065845487ff168daa9e": "Aurangabad",
                "6719f065845487ff168daaa8": "Beed",
                "6719f065845487ff168daab4": "Bhandara",
                "6719f065845487ff168daabc": "Buldhana",
                "6719f065845487ff168daaca": "Chandrapur",
                "6719f065845487ff168daada": "Dhule",
                "6719f065845487ff168daadf": "Gadchiroli",
                "6719f065845487ff168daaec": "Gondia",
                "6719f065845487ff168daaf5": "Hingoli",
                "6719f065845487ff168daafb": "Jalgaon",
                "6719f065845487ff168dab0b": "Jalna",
                "6719f065845487ff168dab14": "Kolhapur",
                "6719f065845487ff168dab21": "Latur",
                "6719f065845487ff168dab2c": "Nagpur",
                "6719f065845487ff168dab3b": "Nanded",
                "6719f065845487ff168dab4c": "Nandurbar",
                "6719f065845487ff168dab53": "Nashik",
                "6719f065845487ff168dab63": "Osmanabad",
                "6719f065845487ff168dab6c": "Parbhani",
                "6719f065845487ff168dab76": "Pune",
                "6719f065845487ff168dab85": "Raigarh (Maharashtra)",
                "6719f065845487ff168dab95": "Ratnagiri",
                "6719f065845487ff168dab9f": "Sangli",
                "6719f065845487ff168dabaa": "Satara",
                "6719f065845487ff168dabb6": "Sindhudurg",
                "6719f065845487ff168dabbf": "Solapur",
                "6719f065845487ff168dabcb": "Thane",
                "6719f065845487ff168dabdb": "Wardha",
                "6719f065845487ff168dabe4": "Washim",
                "6719f065845487ff168dabeb": "Yavatmal",
                "67f5169f08fc557efd607cb2": "Mumbai City",
                "67f715c3322cddc00545a5f2": "Ahmednagar",
                "67f717bf322cddc00545e5fc": "Noney",
                "67f717f0322cddc0054601bd": "Senapati",
                "68107f950812b07290d60ca4": "Raigad",
                "6813a28d226e4a20c4c7e6ef": "Mumbai Suburban"
            }

            let source_by = {
                '6719f065845487ff168da08f': 'Assam - RCS + field team',
                '6719f065845487ff168da562': 'Haryana data - State',
                '6719f065845487ff168db1ae': 'UP -  RCS + field team'
            }


            console.log(farmers[0])
            const records = farmers.map(async f =>
            ({
                farmer_id: f.farmer_id || 'NA',
                name: f.name || 'NA',
                mobile_no: f?.mobile_no || 'NA',
                gender: f?.gender || 'NA',
                category: f?.category || 'NA',
                state: stateObj[f.state_id.toString()] || 'NA',
                district: await getDistrictTitleById(f.district_id),
                account_no: f?.account_no || 'NA',
                ifsc_code: f?.ifsc_code || 'NA',
                bank_name: f?.bank_name || 'NA',
                source_by: source_by[f.state_id.toString()] || 'NA',
                branch_name: f?.branch_name || 'NA',
                associate_name: f?.associate_name || 'NA',
                scheme_status: f.state_id.toString() == "6719f065845487ff168da562" ? "PSS_Rabi _Mustard(2025-2026)" : "Open/ commercial",
            }));

            await csvWriter.writeRecords(records);
            skip += BATCH_SIZE;
            batch++;
        }

        console.log('✅ Export completed: farmers.csv');
        process.exit(0); // Exit the Node.js process

    } catch (error) {
        console.error('❌ Error during export:', error);
        process.exit(1);
    }
}

