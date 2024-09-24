const HeadOffice = require("@src/v1/models/app/auth/HeadOffice");
const { _userType } = require("@src/v1/utils/constants");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { _handleCatchErrors } = require("@src/v1/utils/helpers");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { emailService } = require("@src/v1/utils/third_party/EmailServices");
const bcrypt = require('bcrypt');



const sendHoCredentials = async (userData) => {
    await emailService.sendHoCredentialsEmail(userData);
};

module.exports.getHo = async (req, res) => {

    try {
        const { page, limit, skip, paginate = 1, sortBy, search = '', isExport = 0 } = req.query
        let query = {
            ...(search ? { name: { $regex: search, $options: "i" }, deletedAt: null } : { deletedAt: null })
        };
        const records = { count: 0 };
        records.rows = paginate == 1
            ? await HeadOffice.find(query)
                .sort(sortBy)
                .skip(skip)
                .limit(parseInt(limit))

            : await HeadOffice.find(query).sort(sortBy);
            
        records.count = await HeadOffice.countDocuments(query);
        
        if (paginate == 1) {
            records.page = page
            records.limit = limit
            records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0
        }

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Head Office") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

const generateRandomPassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    return password;
};

module.exports.saveHeadOffice = async (req, res) => {
    try {
        const {company_details, point_of_contact, address, authorised} = req.body;
        const password = generateRandomPassword();
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const headOffice = new HeadOffice({
            office_id: 'HO123456',
            password: hashedPassword,
            email_verified: false,
            user_ype: "5",
            company_details,
            point_of_contact,
            address,
            authorised,
        });

        const savedHeadOffice = await headOffice.save();
        const hoPocData = {
            email: savedHeadOffice.point_of_contact.email,
            name: savedHeadOffice.point_of_contact.name,
            password: password,
        }
        const hoAuthorisedData = {
            email: savedHeadOffice.authorised.email,
            name: savedHeadOffice.authorised.name,
            password: password,
        }
    
        await sendHoCredentials(hoPocData);

        return res.status(200).send(new serviceResponse({ message: _response_message.created('Head Office'), data: savedHeadOffice }));
    } catch (error) {
        _handleCatchErrors(error, res);
    }
};