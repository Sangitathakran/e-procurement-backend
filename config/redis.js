const Redis = require('redis')
const redisClient = Redis.createClient()

redisConnect().catch(err => console.log(err));

async function redisConnect() {
    await redisClient.on('error', err => console.log('Redis Client Error', err))
        .connect();
}

module.exports = { redisClient }