const { State } = require("@src/v1/models/master/states");

/**
 * Get the _id of a state by its state_title
 * @param {String} stateTitle
 * @returns {Promise<ObjectId|null>}
 */
async function getStateIdByTitle(stateTitle) {
  const state = await State.findOne(
    { state_title: stateTitle },
    { _id: 1 }
  ).lean();
  return state ? state._id : null;
}

/**
 * Get the _id of a district by state_id and district_title
 * @param {ObjectId} stateId
 * @param {String} districtTitle
 * @returns {Promise<ObjectId|null>}
 */
async function getDistrictIdByTitle(stateId, districtTitle) {
  const state = await State.findOne(
    { _id: stateId, "districts.district_title": districtTitle },
    { "districts.$": 1 }
  ).lean();

  if (state && state.districts && state.districts.length > 0) {
    return state.districts[0]._id;
  }
  return null;
}

module.exports = { getStateIdByTitle, getDistrictIdByTitle };
