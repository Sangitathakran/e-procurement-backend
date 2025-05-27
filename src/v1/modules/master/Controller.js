const { _handleCatchErrors } = require("@src/v1/utils/helpers")
const { Variety } = require("@src/v1/models/master/Variety");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Unit } = require("@src/v1/models/master/Unit");
const { Grade } = require("@src/v1/models/master/Grade");
const { Organizations } = require("@src/v1/models/master/Organizations");



module.exports.createVariety = async (req, res) => {

    try {

        const { name } = req.body;

        const findVariety = await Variety.findOne({ name });

        if (findVariety) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.allReadyExist("Variety") }] });
        }

        const record = await Variety.create({ name });


        return sendResponse({ res,status: 200, data: record, message: _response_message.created("Variety") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }

}


module.exports.getVariety = async (req, res) => {

    try {

        const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;

        const query = search ? { name: { $regex: search, $options: "i" } } : { deletedAt: null };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Variety.find(query).skip(skip).limit(parseInt(limit)).sort(sortBy) : await Variety.find(query).sort(sortBy);

        records.count = await Variety.countDocuments();

        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
        }

        return sendResponse({res, status: 200, data: records, message: _response_message.found("variety") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getVarietyById = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await Variety.findOne({ _id: id, deletedAt: null });

        if (!record) {
            sendResponse({res, status: 200, errors: [{ message: _response_message.notFound("variety") }] })
        }

        return sendResponse({res, status: 200, data: record, message: _response_message.found("variety") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.updateVariety = async (req, res) => {

    try {

        const { id, name, status } = req.body;

        const existingRecord = await Variety.findOne({ _id: id, deletedAt: null });

        if (!existingRecord) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("variety") }] })
        }


        const existingName = await Variety.findOne({ name });

        if (existingName && existingName._id != id) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.allReadyExist("variety") }] })
        }

        const updatedVariety = await Variety.findOneAndUpdate({ _id: id }, { name, status }, { new: true });

        return sendResponse({res, status: 200, data: updatedVariety, message: _response_message.updated("variety") })

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.deleteVariety = async (req, res) => {

    try {

        const { id } = req.params;

        const existingRecord = await Variety.findOne({ _id: id });

        if (!existingRecord) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("variety") }] })
        }

        const record = await Variety.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true });

        return sendResponse({res, status: 200, data: record, message: _response_message.deleted("variety") })

    } catch (error) {

        _handleCatchErrors(error, res);
    }
}


module.exports.createUnit = async (req, res) => {

    try {

        const { name } = req.body;

        const findUnit = await Unit.findOne({ name });

        if (findUnit) {
            return sendResponse({ res,status: 200, errors: [{ message: _response_message.allReadyExist("Unit") }] })
        }

        const record = await Unit.create({ name });

        return sendResponse({res, status: 200, data: record, message: _response_message.created("Unit") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getUnit = async (req, res) => {

    try {

        const { page, limit, skip, paginate, sortBy, search = "" } = req.query;

        const query = search ? { name: { $regex: search, $options: "i" } } : { deletedAt: null };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Unit.find(query).limit(parseInt(limit)).skip(skip).sort(sortBy) : await Unit.find(query).sort(sortBy)

        records.count = await Unit.countDocuments(query);

        if (paginate == 1) {

            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
        }

        return sendResponse({res, status: 200, data: records, messsage: _response_message.found("unit") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.getUnitById = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await Unit.findOne({ _id: id });

        if (!record) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("unit") }] });
        }

        return sendResponse({ res,status: 200, data: record, message: _response_message.found("unit") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.updateUnit = async (req, res) => {

    try {

        const { id, name, status } = req.body;

        const existingRecord = await Unit.findOne({ _id: id, deletedAt: null });

        if (!existingRecord) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("unit") }] });
        }

        const existingName = await Unit.findOne({ name, deletedAt: null });

        if (existingName && existingName._id != id) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.allReadyExist("unit") }] });
        }

        const record = await Unit.findOneAndUpdate({ _id: id }, { name, status }, { new: true });
        return sendResponse({res, status: 200, data: record, message: _response_message.updated("unit") });


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}

module.exports.deleteUnit = async (req, res) => {

    try {
        const { id } = req.params;

        const existingRecord = await Unit.findOne({ _id: id });

        if (!existingRecord) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("Unit") }] })
        }

        const record = await Unit.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true });

        return { status: 200, data: record, message: _response_message.deleted("Grade") };

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.createGrade = async (req, res) => {

    try {

        const { name } = req.body;

        const existingRecord = await Grade.findOne({ name });

        if (existingRecord) {
            return sendResponse({res, status: 200, errors: [{ message: _response_message.allReadyExist("Grade") }] });
        }

        const record = await Grade.create({ name });

        return sendResponse({res,status: 200, data: record, message: _response_message.created("Grade") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getGrade = async (req, res) => {

    try {

        const { page, limit, skip = 0, paginate, sortBy, search = "" } = req.query;

        const query = search ? { name: { $regex: search, $options: "i" } } : { deletedAt: null };

        const records = { count: 0 };

        records.count = await Grade.countDocuments();

        records.rows = paginate == 1 ? await Grade.find(query).limit(parseInt(limit)).skip(skip).sort(sortBy) : await Grade.find(query).sort(sortBy);


        if (paginate == 1) {
            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
        }

        return sendResponse({res, status: 200, data: records, message: _response_message.found("Grade") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.getGradeById = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await Grade.findOne({ _id: id });

        if (!record) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("Grade") }] });
        }

        return sendResponse({res,status: 200, data: record, message: _response_message.found("Grade") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.updateGrade = async (req, res) => {

    try {

        const { id, name, status } = req.body;

        const existingRecord = await Grade.findOne({ _id: id, deletedAt: null });

        if (!existingRecord) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("Grade") }] });
        }

        const existingName = await Grade.findOne({ name, deletedAt: null });

        if (existingName && existingName._id != id) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.allReadyExist("Grade") }] });
        }

        const record = await Grade.findOneAndUpdate({ _id: id }, { name, status }, { new: true });
        return sendResponse({ res,status: 200, data: record, message: _response_message.updated("Grade") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.deleteGrade = async (req, res) => {

    try {

        const { id } = req.params;

        const record = await Grade.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true });

        return sendResponse({res, status: 200, data: record, message: _response_message.deleted("Grade") });


    } catch (error) {
        _handleCatchErrors(error, res);
    }
}



module.exports.createOrganization = async (req, res) => {


    try {

        const { name, metaInfo = {} } = req.body;

        const alias = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

        const existingData = await Organizations.findOne({ $or: [{ name }, { alias }] });

        if (existingData) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.allReadyExist("organization") }] });
        }

        const record = await Organizations.create({ name, alias, metaInfo });

        return sendResponse({res, status: 200, data: record, message: _response_message.created("organization") });


    } catch (error) {

        _handleCatchErrors(error, res);
    }
}


module.exports.getOrganizations = async (req, res) => {

    try {

        const { page, limit, skip, paginate, sortBy, search = "" } = req.query;

        const query = search ? { name: { $regex: search, $options: "i" } } : { deletedAt: null };

        const records = { count: 0 };

        records.rows = paginate == 1 ? await Organizations.find(query).limit(parseInt(limit)).skip(skip).sort(sortBy) : await Organizations.find(query).select("_id alias name").sort(sortBy);

        records.count = await Organizations.countDocuments(query);

        if (paginate == 1) {

            records.page = page;
            records.limit = limit;
            records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
        }

        return sendResponse({res, status: 200, data: records, message: _response_message.found("organization") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}


module.exports.updateOrganization = async (req, res) => {

    try {

        const { id, name, metaInfo, status } = req.body;

        const findExisting = await Organizations.findOne({ _id: id, deletedAt: null });

        if (!findExisting) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.notFound("organization") }] });
        }

        const existingName = await Organizations.findOne({ name });

        if (existingName && existingName._id != id) {
            return sendResponse({res, status: 400, errors: [{ message: _response_message.allReadyExist("organization") }] });
        }

        const record = await Organizations.findOneAndUpdate({ _id: id }, { name, metaInfo, status }, { new: true });

        return sendResponse({res, status: 200, data: record, message: _response_message.updated("organization") });

    } catch (error) {
        _handleCatchErrors(error, res);
    }
}
