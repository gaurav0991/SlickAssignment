const redis = require('redis');
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient({
  host: 'localhost', // or the Redis server host
  port: REDIS_PORT,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('ready', () => console.log('Redis client connected and ready'));
redisClient.connect().catch(console.error);

module.exports = redisClient;
//cat /etc/redis/redis.conf | grep '^port'
