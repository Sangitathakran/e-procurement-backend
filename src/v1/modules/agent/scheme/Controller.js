const { Scheme } = require("@src/v1/models/master/Scheme");
module.exports.createAgentScheme = async (req, res) => {
  try {
    const {
      schemeName,
      season,
      period,
      centralNodalAgency,
      procurement,
      commodity,
    } = req.body;
    // CREATE NEW SCHEME RECORD
    const record = await Scheme.create({
      schemeName,
      season,
      period,
      centralNodalAgency,
      procurement,
      commodity,
      status: "Active",
    });
    return res.status(201).json({
      status: 201,
      data: record,
      message: "Agent scheme created successfully.",
    });
  } catch (error) {
    console.error("Error creating agent scheme:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};

