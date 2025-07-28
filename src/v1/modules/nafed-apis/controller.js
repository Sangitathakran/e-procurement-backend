const { DistilleryStats, DistilleryStatsHistory } = require("@src/v1/models/app/auth/distilleryStats");
const {MasterUser} = require("@src/v1/models/master/MasterUser");
const { sendResponse } = require("@src/v1/utils/helpers/api_response");
const logService = require("@common/logger/logger");
const bcrypt = require("bcryptjs");
const {distilleryStatsSchema} = require("@modules/nafed-apis/validation");

exports.updateDistilleryStats = async (req, res) => {
  const headerEmail = req.headers["x-auth-email"];
  const headerPassword = req.headers["x-auth-password"];

  try {
    if (!headerEmail || !headerPassword) {
      logService.error("Missing credentials in header");
      return sendResponse({
        res,
        status: 401,
        message: "Missing credentials in header"
      });
    }

      const { error, value: newStats } = distilleryStatsSchema.validate(req.body);
    if (error) {
      logService.warn("Validation failed", error.details);
      return sendResponse({
        res,
        status: 400,
        message: "Validation Error",
        errors: error.details.map(e => e.message),
      });
    }

    // Verify user from headers
    const user = await MasterUser.findOne({ email: headerEmail.trim() });
    if (!user) {
      logService.error("User not found", { email: headerEmail });
      return sendResponse({
        res,
        status: 401,
        message: "Invalid credentials"
      });
    }

    const isPasswordValid = await bcrypt.compare(headerPassword, user.password);
    if (!isPasswordValid) {
      logService.error("Invalid password", { email: headerEmail });
      return sendResponse({
        res,
        status: 401,
        message:  "Invalid credentials"
      });
    }

    let existing = await DistilleryStats.findOne();

    // Case: create new
    if (!existing) {
      const created = await DistilleryStats.create(newStats);

      await DistilleryStatsHistory.create({
        distilleryStatsId: created._id,
        changes: { old: {}, new: newStats },
        changedBy: user._id,
      });

      logService.info("Stats created by user", { email: user.email, stats: newStats });
      return sendResponse({
        res,
        status: 200,
        message: "updated distiller stats successfully"
      });
    }

    // Case: update existing
    const oldStats = {
      totalDistilleriesRegistered: existing.totalDistilleriesRegistered,
      totalPOsRaised: existing.totalPOsRaised,
      totalProcurementMT: existing.totalProcurementMT,
      totalLiftingMT: existing.totalLiftingMT,
      totalPaymentByDistilleries: existing.totalPaymentByDistilleries,
    };

    const updated = await DistilleryStats.findByIdAndUpdate(
      existing._id,
      { ...newStats },
      { new: true }
    );

    await DistilleryStatsHistory.create({
      distilleryStatsId: updated._id,
      changes: { old: oldStats, new: newStats },
      changedBy: user._id,
    });

    logService.info("Stats updated by user", {
      email: user.email,
      old: oldStats,
      new: newStats
    });

    return sendResponse({
      res,
      status: 200,
      message: "updated distiller stats successfully",
    });

  } catch (err) {
    logService.error("Error in updating distillery stats", err);
    return sendResponse({
      res,
      status: 500,
      message:"Internal server error",
    });
  }
};
