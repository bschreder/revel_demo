import { RedisOptions } from 'bullmq';

/**
 * Returns Redis connection options from environment variables.
 * @returns {RedisOptions} Redis connection options
 */
export function getRedisConfig(): RedisOptions {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
  };
}


