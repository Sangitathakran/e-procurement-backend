const { StateDistrictCity } = require('@src/v1/models/master/StateDistrictCity');
const logger = require("@common/logger/logger");

/**
 * Get state object by state title
 * @param {string} stateTitle
 * @returns {Promise<{_id: ObjectId, state_title: string} | null>}
 */

const getStateIdBystateName = async (stateTitle) => {
  try {
    if (!stateTitle) {
      return  "State title is required"
    }

    const stateData = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      {
        $match: {
          "states.state_title": stateTitle?.trim(),
        },
      },
      { $replaceRoot: { newRoot: "$states" } },
      {
        $project: {
           stateId: "$_id",    
          state_title: 1,
        },
      },
    ]);

    if (!stateData.length) {
      return  "State not found"
    }

    return stateData[0]
  } catch (error) {
    logger.error("Error in getStateByTitle:", error);
    return error
  }
};


const getDistrictIdByname = async (stateTitle, districtTitle) => {
  try {
    if (!stateTitle || !districtTitle) {
      return "State and district title are required";
    }

    const result = await StateDistrictCity.aggregate([
      { $unwind: "$states" },
      {
        $match: {
          "states.state_title": stateTitle.trim(),
        },
      },
      { $unwind: "$states.districts" },
      {
        $match: {
          "states.districts.district_title": districtTitle.trim(),
        },
      },
      {
        $project: {
          districtId: "$states.districts._id",
          district_title: "$states.districts.district_title",
          state_title: "$states.state_title",
          stateId: "$states._id", 
        },
      },
    ]);

    if (!result.length) {
      return "District not found";
    }

    return result[0]; // includes stateId
  } catch (error) {
    console.log(error.message)
    logger.error("Error in getDistrictIdByName:", error);
    return error;
  }
};


module.exports = {
  getStateIdBystateName,getDistrictIdByname
};
