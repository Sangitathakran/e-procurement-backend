const redisService = require("@src/common/services/RedisService");
const { State } = require("@src/v1/models/master/states");
const { redisKeys } = require("../constants");
const logger = require("@src/common/logger/logger");

/**
 * Cache states + districts in Redis
 * @param {number|null} ttl - TTL in seconds (optional)
 */
async function cacheStatesData(ttl = null) {
  try {
    logger.info("Fetching states from MongoDB (only required fields)...");

    const states = await State.find(
      {},
      {
        _id: 1,
        state_title: 1,
        state_code: 1,
        "districts._id": 1,
        "districts.district_title": 1,
      }
    ).lean();

    // States data (without districts)
    const statesData = states.map((s) => ({
      _id: s._id,
      state_title: s.state_title,
      state_code: s.state_code,
    }));

    // Districts keyed by state_id
    const districtsByState = {};
    states.forEach((s) => {
      districtsByState[s._id] = (s.districts || []).map((d) => ({
        _id: d._id,
        district_title: d.district_title,
      }));
    });

    // Store both in Redis
    await redisService.setJson(redisKeys.STATES_DATA, statesData, ttl);
    await redisService.setJson(
      redisKeys.DISTRICTS_BY_STATE,
      districtsByState,
      ttl
    );

    logger.info(`Cached ${statesData.length} states & districts in Redis`);
  } catch (error) {
    logger.error("Error caching states & districts:", error);
  }
}

/**
 * Get all districts for a given state_id
 */
async function getDistrictsByState(state_id) {
  try {
    const districtsByState = await redisService.getJson(
      redisKeys.DISTRICTS_BY_STATE
    );

    if (!districtsByState) {
      logger.warn("No districts found in Redis cache.");
      return [];
    }

    return districtsByState[state_id] || [];
  } catch (err) {
    logger.error("Error fetching districts by state:", err);
    return [];
  }
}

/**
 * Get a specific district by state_id and district_id
 */
async function getDistrictById(state_id, district_id) {
  try {
    const districts = await getDistrictsByState(state_id);
    return districts.find((d) => String(d._id) === String(district_id)) || null;
  } catch (err) {
    logger.error("Error fetching district by id:", err);
    return null;
  }
}

module.exports = {
  cacheStatesData,
  getDistrictsByState,
  getDistrictById,
};
