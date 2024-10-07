const { _handleCatchErrors, dumpJSONToExcel } = require("@src/v1/utils/helpers")
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message, _middleware } = require("@src/v1/utils/constants/messages");
const { ProcurementCenter } = require("@src/v1/models/app/procurement/ProcurementCenter");
const { FarmerOffers } = require("@src/v1/models/app/procurement/FarmerOffers");
const { User } = require("@src/v1/models/app/auth/User");
const { Branches } = require("@src/v1/models/app/branchManagement/Branches");
const { farmer } = require("@src/v1/models/app/farmerDetails/Farmer");
const { decryptJwtToken } = require("@src/v1/utils/helpers/jwt");
const { _userType, _userStatus, _status, _procuredStatus } = require("@src/v1/utils/constants");


module.exports.getDashboardStats = async (req, res) => {

    try {

        const currentDate = new Date();
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

        const lastMonthAssociates = await User.countDocuments({
            user_type: _userType.associate,
            is_form_submitted: true,
            is_approved: _userStatus.approved,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });
        console.log('lastMonthAssociates',lastMonthAssociates)

        const currentMonthAssociates = await User.countDocuments({
            user_type: _userType.associate,
            is_form_submitted: true,
            is_approved: _userStatus.approved,
            createdAt: { $gte: startOfCurrentMonth }
        });
        console.log('currentMonthAssociates',currentMonthAssociates)

        const difference = currentMonthAssociates - lastMonthAssociates;
        const status = difference >= 0 ? 'increased' : 'decreased';

        let differencePercentage = 0;
        if (lastMonthAssociates > 0) {
            differencePercentage = (difference / lastMonthAssociates) * 100;
        }

        const branchOfficeCount = (await Branches.countDocuments({ status: _status.active })) ?? 0;
        const associateCount = (await User.countDocuments({ user_type: _userType.associate, is_approved:_userStatus.approved, is_form_submitted:true })) ?? 0;
        const procurementCenterCount = (await ProcurementCenter.countDocuments({ active:true })) ?? 0;
        const farmerCount = (await farmer.countDocuments({ status: _status.active })) ?? 0;

        const associateStats = {
            totalAssociates : associateCount,
            currentMonthAssociates,
            lastMonthAssociates,
            difference,
            differencePercentage: differencePercentage.toFixed(2) + '%',
            status: status,
        };

        const records = { 
            branchOfficeCount,
            associateStats, 
            procurementCenterCount, 
            farmerCount 
        };

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Dashboard Stats") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getProcurementsStats = async (req, res) => {

    try {

        const procurementsStats = await FarmerOffers.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Initialize counts for each status
        const records = {
            received: 0,
            pending: 0,
            failed: 0,
        };

        // Map the counts from the aggregation result
        procurementsStats.forEach(item => {
            if (item._id === _procuredStatus.received) {
                records.received = item.count;
            } else if (item._id === _procuredStatus.pending) {
                records.pending = item.count;
            } else if (item._id === _procuredStatus.failed) {
                records.failed = item.count;
            }
        });

        return res.send(new serviceResponse({ status: 200, data: records, message: _response_message.found("Procured Stats") }));

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
