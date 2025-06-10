const { createClient } = require("redis");
const  logger  = require("@common/logger/logger");
require("dotenv").config();

const {
  REDIS_PROTOCOL,
  REDIS_SERVER,
  REDIS_PORT,
  REDIS_USER,
  REDIS_SECRET,
} = process.env;

const redisUrl = `${REDIS_PROTOCOL}://${REDIS_SERVER}:${REDIS_PORT}`;

const client = createClient({
  url: redisUrl,
  username: REDIS_USER || undefined,
  password: REDIS_SECRET || undefined,
});

client.on("error", (err) => {
  logger.error({ method: "redisClient", msg: "Redis Client Error", data: err });
});

let isConnected = false;

async function connectRedis() {
  if (isConnected) return; // Prevent reconnecting
  try {
    await client.connect();
    isConnected = true;
    logger.info({ method: "redisClient", msg: "Connected to Redis", data: [] });
  } catch (error) {
    logger.error({ method: "redisClient", msg: "Redis connection error", data: error });
    throw error;
  }
}

async function disconnectRedis() {
  if (!isConnected) return;
  try {
    await client.quit();
    isConnected = false;
    logger.info({ method: "redisClient", msg: "Disconnected from Redis", data: [] });
  } catch (error) {
    logger.error({ method: "redisClient", msg: "Redis disconnection error", data: error });
  }
}

process.on("SIGINT", async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectRedis();
  process.exit(0);
});

module.exports = {
  client,
  connectRedis,
  disconnectRedis,
};