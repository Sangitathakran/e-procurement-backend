const {
    _handleCatchErrors,
    dumpJSONToExcel,
  } = require("@src/v1/utils/helpers");
  
  
  const { mongoose } = require("mongoose");
  const { Distiller } = require("@src/v1/models/app/auth/Distiller");
  const { CenterProjection } = require("@src/v1/models/app/distiller/centerProjection");
  const xlsx = require("xlsx");
  const csv = require("csv-parser");
  const { Readable } = require("stream");

  module.exports.getCenterProjections= async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        state = '',
        district = ''
      } = req.query;
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
      const query = {};
      if (search) {
        query.$or = [
          { state: { $regex: search, $options: 'i' } },
          { district: { $regex: search, $options: 'i' } },
          { center_location: { $regex: search, $options: 'i' } },
        ];
      }
      if (state) {
        query.state = { $regex: state, $options: 'i' };
      }
  
      if (district) {
        query.district = { $regex: district, $options: 'i' };
      }
  
      const [total, data] = await Promise.all([
        CenterProjection.countDocuments(query),
        CenterProjection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
      ]);
  
      return res.status(200).json({
        status: 200,
        data,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        message: "Center Projections fetched successfully"
      });
  
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Error fetching center projections",
        error: error.message
      });
    }
  };
  
module.exports.bulkuplodCenterProjection = async (req, res) => {
    try {
      const { isxlsx = 1 } = req.body;
      const [file] = req.files;
  
      if (!file) {
        return res.status(400).json({
          message: _response_message.notFound("file"),
          status: 400
        });
      }
  
      let records = [];
      let headers = [];
      let errorArray = [];
  
      const processRecord = async (rec) => {
        const state = rec["state"];
        const district = rec["district"];
        const center_location = rec["center_location"] || null;
        const current_projection = rec["current_projection"];
  
        try {
          if (!state || !district || !center_location || !current_projection) {
            throw new Error("Missing required fields");
          }
  
          await CenterProjection.create({
            state,
            district,
            center_location,
            current_projection: isNaN(current_projection)
              ? current_projection
              : Number(current_projection),
          });
  
          return { success: true };
        } catch (error) {
          return { success: false, errors: [{ record: rec, error: error.message }] };
        }
      };
  
      if (isxlsx) {
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        records = xlsx.utils.sheet_to_json(worksheet);
        headers = Object.keys(records[0]);
  
        for (let rec of records) {
          const result = await processRecord(rec);
          if (!result.success) {
            errorArray = errorArray.concat(result.errors);
          }
        }
  
        if (errorArray.length > 0) {
          const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
          return dumpJSONToExcel(req, res, {
            data: errorData,
            fileName: `CenterProjection-error_records.xlsx`,
            worksheetName: `Projection-error-records`
          });
        } else {
          return res.status(200).json({
            status: 200,
            data: {},
            message: "Center Projections successfully uploaded."
          });
        }
  
      } else {
        const csvContent = file.buffer.toString('utf8');
        const lines = csvContent.split('\n');
        headers = lines[0].trim().split(',');
        const dataContent = lines.slice(1).join('\n');
  
        const parser = csv({ headers });
        const readableStream = Readable.from(dataContent);
  
        readableStream.pipe(parser);
  
        parser.on('data', async (data) => {
          if (Object.values(data).some(val => val !== '')) {
            const result = await processRecord(data);
            if (!result.success) {
              errorArray = errorArray.concat(result.errors);
            }
          }
        });
  
        parser.on('end', () => {
          if (errorArray.length > 0) {
            const errorData = errorArray.map(err => ({ ...err.record, Error: err.error }));
            return dumpJSONToExcel(req, res, {
              data: errorData,
              fileName: `CenterProjection-error_records.xlsx`,
              worksheetName: `Projection-error-records`
            });
          } else {
            return res.status(200).json({
              status: 200,
              data: {},
              message: "Center Projections successfully uploaded."
            });
          }
        });
  
        parser.on('error', (err) => {
          return res.status(500).json({
            status: 500,
            message: "CSV parsing error",
            error: err.message
          });
        });
      }
  
    } catch (error) {
      _handleCatchErrors(error, res);
    }
  };