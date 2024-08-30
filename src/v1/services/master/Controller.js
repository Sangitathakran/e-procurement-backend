const { asyncErrorHandler } = require("@src/v1/utils/helpers/asyncErrorHandler");
const { Variety } = require("@src/v1/models/master/Variety");
const { serviceResponse } = require("@src/v1/utils/helpers/api_response");
const { _response_message } = require("@src/v1/utils/constants/messages");
const { Unit } = require("@src/v1/models/master/Unit");
const { Grade } = require("@src/v1/models/master/Grade");

module.exports.createVariety = asyncErrorHandler(async (req, res) => {

     const { name } = req.body;

     const findVariety = await Variety.findOne({ name });

     if (findVariety) {
          return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.allReadyExist("variety") }] }))
     }

     const record = await Variety.create({ name });

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("variety") }))

})

module.exports.getVariety = asyncErrorHandler(async (req, res) => {

     const { page, limit, offset = 0, paginate, sortBy, search = "" } = req.query;

     let query = search ? { name: { $regex: search, $options: 'i' }, deletedAt: null } : { deletedAt: null };

     const records = { count: 0 };

     records.rows = paginate == 1 ? await Variety.find(query).skip(offset).limit(parseInt(limit)).sort(sortBy) : await Variety.find(query).sort(sortBy);

     records.count = await Variety.countDocuments(query);


     if (paginate == 1) {

          records.page = page;
          records.limit = limit;
          records.pages = limit != 0 ? Math.ceil(records.count / limit) : 0;
     }

     return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("variety") }))
})

module.exports.getVarietyById = asyncErrorHandler(async (req, res) => {

     const { id } = req.params;

     const record = await Variety.findOne({ _id: id, deletedAt: null });

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("variety") }));
})


module.exports.updateVariety = asyncErrorHandler(async (req, res) => {

     const { id, name, status } = req.body;

     const existingRecord = await Variety.findOne({ _id: id, deletedAt: null });

     if (!existingRecord) {
          return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("variety") }] }));
     }

     const existingName = await Variety.findOne({ name, deletedAt: null });

     if (existingName && existingName._id != id) {
          return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("variety") }] }));

     }

     const record = await Variety.findOneAndUpdate({ _id: id }, { name, status }, { new: true });
     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("variety") }));


})


module.exports.deleteVariety = asyncErrorHandler(async (req, res) => {

     const { id } = req.params;

     const record = await Variety.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true })

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.deleted("variety") }));
})



module.exports.createUnit = asyncErrorHandler(async (req, res) => {

     const { name } = req.body;

     const findUnit = await Unit.findOne({ name });

     if (findUnit) {
          return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.allReadyExist("unit") }] }))
     }

     const record = await Unit.create({ name });

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("unit") }))

})

module.exports.getUnit = asyncErrorHandler(async (req, res) => {

     const { page, limit, offset, paginate, sortBy, search = "" } = req.query;

     const query = search ? { name: { $regex: search, $options: i }, deletedAt: null } : { deletedAt: null };

     const records = { count: 0 };

     records.rows = paginate == 1 ? await Unit.find(query).skip(offset).limit(parseInt(limit)).sort(sortBy) : await Unit.find(query).sort(sortBy);

     records.count = await Unit.countDocuments(query);

     if (paginate == 1) {

          records.page = page;
          records.limit = limit;
          records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
     }

     return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("unit") }))
})

module.exports.getUnitById = asyncErrorHandler(async (req, res) => {

     const { id } = req.params;

     const record = await Unit.findOne({ _id: id, deletedAt: null });

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("unit") }));
})


module.exports.updateUnit = asyncErrorHandler(async (req, res) => {

     const { id, name, status } = req.body;

     const existingRecord = await Unit.findOne({ _id: id, deletedAt: null });

     if (!existingRecord) {
          return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("unit") }] }));
     }

     const existingName = await Unit.findOne({ name, deletedAt: null });

     if (existingName && existingName._id != id) {
          return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("unit") }] }));

     }

     const record = await Unit.findOneAndUpdate({ _id: id }, { name, status }, { new: true });
     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("unit") }));


})


module.exports.deleteUnit = asyncErrorHandler(async (req, res) => {

     const { id } = req.params;

     const record = await Unit.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true })

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.deleted("unit") }));
})



module.exports.createGrade = asyncErrorHandler(async (req, res) => {

     const { name } = req.body;

     const findGrade = await Grade.findOne({ name });

     if (findGrade) {
          return res.status(200).send(new serviceResponse({ status: 200, errors: [{ message: _response_message.allReadyExist("grade") }] }))
     }

     const record = await Grade.create({ name });

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.created("grade") }))

})

module.exports.getGrade = asyncErrorHandler(async (req, res) => {

     const { page, limit, offset, paginate, sortBy, search = "" } = req.query;

     const query = search ? { name: { $regex: search, $options: i }, deletedAt: null } : { deletedAt: null };

     const records = { count: 0 };

     records.rows = paginate == 1 ? await Grade.find(query).skip(offset).limit(parseInt(limit)).sort(sortBy) : await Grade.find(query).sort(sortBy);

     records.count = await Grade.countDocuments(query);

     if (paginate == 1) {

          records.page = page;
          records.limit = limit;
          records.pages = limit != 0 ? Math.ceil(records.count / 10) : 0;
     }

     return res.status(200).send(new serviceResponse({ status: 200, data: records, message: _response_message.found("grade") }))
})

module.exports.getGradeById = asyncErrorHandler(async (req, res) => {

     const { id } = req.params;

     const record = await Grade.findOne({ _id: id, deletedAt: null });

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.found("grade") }));
})


module.exports.updateGrade = asyncErrorHandler(async (req, res) => {

     const { id, name, status } = req.body;

     const existingRecord = await Grade.findOne({ _id: id, deletedAt: null });

     if (!existingRecord) {
          return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.notFound("grade") }] }));
     }

     const existingName = await Grade.findOne({ name, deletedAt: null });

     if (existingName && existingName._id != id) {
          return res.status(200).send(new serviceResponse({ status: 400, errors: [{ message: _response_message.allReadyExist("grade") }] }));

     }

     const record = await Grade.findOneAndUpdate({ _id: id }, { name, status }, { new: true });
     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.updated("grade") }));


})


module.exports.deleteGrade = asyncErrorHandler(async (req, res) => {

     const { id } = req.params;

     const record = await Grade.findOneAndUpdate({ _id: id }, { deletedAt: new Date() }, { new: true })

     return res.status(200).send(new serviceResponse({ status: 200, data: record, message: _response_message.deleted("grade") }));
})



