
const { client } = require("@common/db/connection/redisClient");
const  logger  = require("@common/logger/logger");

async function get(key) {
  try {
    return await client.get(key);
  } catch (error) {
    logger.error({ method: "redisService.get", msg: `Failed to get key ${key}`, data: error });
    throw error;
  }
}

async function set(key, value, expiryInSeconds) {
  try {
    if (expiryInSeconds) {
      await client.setEx(key, expiryInSeconds, value);
    } else {
      await client.set(key, value);
    }
  } catch (error) {
    logger.error({ method: "redisService.set", msg: `Failed to set key ${key}`, data: error });
    throw error;
  }
}

async function del(key) {
  try {
    await client.del(key);
  } catch (error) {
    logger.error({ method: "redisService.del", msg: `Failed to delete key ${key}`, data: error });
    throw error;
  }
}

async function flushAll() {
  try {
    await client.flushAll();
  } catch (error) {
    logger.error({ method: "redisService.flushAll", msg: `Failed to flush all keys`, data: error });
    throw error;
  }
}

async function exists(key) {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error({ method: "redisService.exists", msg: `Failed to check existence for key ${key}`, data: error });
    throw error;
  }
}

async function expire(key, seconds) {
  try {
    return await client.expire(key, seconds);
  } catch (error) {
    logger.error({ method: "redisService.expire", msg: `Failed to set expiry for key ${key}`, data: error });
    throw error;
  }
}

async function incr(key) {
  try {
    return await client.incr(key);
  } catch (error) {
    logger.error({ method: "redisService.incr", msg: `Failed to increment key ${key}`, data: error });
    throw error;
  }
}

async function decr(key) {
  try {
    return await client.decr(key);
  } catch (error) {
    logger.error({ method: "redisService.decr", msg: `Failed to decrement key ${key}`, data: error });
    throw error;
  }
}

async function ttl(key) {
  try {
    return await client.ttl(key);
  } catch (error) {
    logger.error({ method: "redisService.ttl", msg: `Failed to get TTL for key ${key}`, data: error });
    throw error;
  }
}

async function keys(pattern = "*") {
  try {
    return await client.keys(pattern);
  } catch (error) {
    logger.error({ method: "redisService.keys", msg: `Failed to get keys with pattern ${pattern}`, data: error });
    throw error;
  }
}

// List commands
async function lpush(key, value) {
  try {
    return await client.lPush(key, value);
  } catch (error) {
    logger.error({ method: "redisService.lpush", msg: `Failed to lpush to key ${key}`, data: error });
    throw error;
  }
}

async function rpush(key, value) {
  try {
    return await client.rPush(key, value);
  } catch (error) {
    logger.error({ method: "redisService.rpush", msg: `Failed to rpush to key ${key}`, data: error });
    throw error;
  }
}

async function lpop(key) {
  try {
    return await client.lPop(key);
  } catch (error) {
    logger.error({ method: "redisService.lpop", msg: `Failed to lpop from key ${key}`, data: error });
    throw error;
  }
}

async function rpop(key) {
  try {
    return await client.rPop(key);
  } catch (error) {
    logger.error({ method: "redisService.rpop", msg: `Failed to rpop from key ${key}`, data: error });
    throw error;
  }
}

async function llen(key) {
  try {
    return await client.lLen(key);
  } catch (error) {
    logger.error({ method: "redisService.llen", msg: `Failed to get length of list key ${key}`, data: error });
    throw error;
  }
}

// Hash commands
async function hset(key, field, value) {
  try {
    return await client.hSet(key, field, value);
  } catch (error) {
    logger.error({ method: "redisService.hset", msg: `Failed to hset field ${field} on key ${key}`, data: error });
    throw error;
  }
}

async function hget(key, field) {
  try {
    return await client.hGet(key, field);
  } catch (error) {
    logger.error({ method: "redisService.hget", msg: `Failed to hget field ${field} on key ${key}`, data: error });
    throw error;
  }
}

async function hdel(key, field) {
  try {
    return await client.hDel(key, field);
  } catch (error) {
    logger.error({ method: "redisService.hdel", msg: `Failed to hdel field ${field} on key ${key}`, data: error });
    throw error;
  }
}

async function hgetall(key) {
  try {
    return await client.hGetAll(key);
  } catch (error) {
    logger.error({ method: "redisService.hgetall", msg: `Failed to hgetall fields on key ${key}`, data: error });
    throw error;
  }
}

// Set commands
async function sadd(key, member) {
  try {
    return await client.sAdd(key, member);
  } catch (error) {
    logger.error({ method: "redisService.sadd", msg: `Failed to sadd member to key ${key}`, data: error });
    throw error;
  }
}

async function smembers(key) {
  try {
    return await client.sMembers(key);
  } catch (error) {
    logger.error({ method: "redisService.smembers", msg: `Failed to get smembers of key ${key}`, data: error });
    throw error;
  }
}

async function srem(key, member) {
  try {
    return await client.sRem(key, member);
  } catch (error) {
    logger.error({ method: "redisService.srem", msg: `Failed to srem member from key ${key}`, data: error });
    throw error;
  }
}

module.exports = {
  get,
  set,
  del,
  flushAll,
  exists,
  expire,
  incr,
  decr,
  ttl,
  keys,
  lpush,
  rpush,
  lpop,
  rpop,
  llen,
  hset,
  hget,
  hdel,
  hgetall,
  sadd,
  smembers,
  srem,
};
