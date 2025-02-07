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

    let randomVal;
    // Generate a sequential order number
    const lastOrder = await Scheme.findOne().sort({ createdAt: -1 }).select("schmeCode").lean();
    if (lastOrder && lastOrder.schmeCode) {
        // Extract the numeric part from the last order's poNo and increment it
        const lastNumber = parseInt(lastOrder.schmeCode.replace(/\D/g, ""), 10); // Remove non-numeric characters
        randomVal = `CO${lastNumber + 1}`;
    } else {
        // Default starting point if no orders exist
        randomVal = "CO1001";
    }

    const record = await Scheme.create({
      schmeCode: randomVal,
      schemeName,
      season,
      period,
      centralNodalAgency,
      procurement,
      commodity,
      // status: "active",
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

