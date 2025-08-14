const { default: mongoose } = require("mongoose");

function convertToObjecId(id) {
  return new mongoose.Types.ObjectId(id);
}


/**
 * Validate query params to ensure they are valid MongoDB ObjectIds.
 * Accepts single values or comma-separated lists.
 * Sends HTTP 400 if any invalid IDs are found.
 */
function validateObjectIdFields(req, res, keys = []) {
  const invalidEntries = [];

  keys.forEach((key) => {
    const value = req.query[key];

    if (!value) return; // skip if empty

    // Split comma-separated values and trim
    const ids = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    ids.forEach((id) => {
      if (!mongoose.isValidObjectId(id)) {
        invalidEntries.push({ field: key, value: id });
      }
    });
  });

  if (invalidEntries.length > 0) {
    return res.status(400).send({
      status: 400,
      message: "Invalid ObjectId(s) in query",
      errors: invalidEntries,
    });
  }

  return true; // validation passed
}


module.exports = { validateObjectIdFields, convertToObjecId };
