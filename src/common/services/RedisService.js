const { createClient } = require("redis");
const logger = require("../logger/logger");

const { REDIS_CRED } = require("@config/index");

class RedisService {
  constructor() {
    this.client = createClient({
      url: REDIS_CRED.REDIS_URL,
      database: REDIS_CRED.REDIS_DB,
    });

    this.client.on("error", (err) => logger.error("Redis Client Error", err));
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
      logger.info(`Connected to Redis (DB ${REDIS_CRED.REDIS_DB})`);
    }
  }

  async setJson(key, value, ttl = null) {
    try {
      if (ttl && typeof ttl === "number") {
        await this.client.set(key, JSON.stringify(value), {
          EX: ttl, // TTL in seconds
        });
        logger.info(`Data set in Redis for key: ${key} with TTL: ${ttl}s`);
      } else {
        await this.client.set(key, JSON.stringify(value));
        logger.info(`Data set in Redis for key: ${key} without TTL`);
      }
    } catch (err) {
      logger.error(`Error setting data in Redis for ${key}:`, err);
    }
  }
  async setJson(key, value, ttl = null) {
    try {
      const data = JSON.stringify(value);
      if (ttl) {
        await this.client.set(key, data, { EX: ttl });
      } else {
        await this.client.set(key, data);
      }
      logger.info(`Data set in Redis for key: ${key}`);
    } catch (err) {
      logger.error(`Error setting data in Redis for ${key}:`, err);
    }
  }

  async getJson(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error(`Error getting data from Redis for ${key}:`, err);
      return null;
    }
  }

  async deleteKey(key) {
    try {
      await this.client.del(key);
      logger.info(`Deleted key from Redis: ${key}`);
    } catch (err) {
      logger.error(`Error deleting key in Redis: ${key}`, err);
    }
  }


}

module.exports = new RedisService();
