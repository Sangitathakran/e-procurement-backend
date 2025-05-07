const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300 });

module.exports = {
  getCache: (key) => cache.get(key),
  setCache: (key, value, ttl) => cache.set(key, value, ttl),
  delCache: (key) => cache.del(key),
  flushCache: () => cache.flushAll(),
};
