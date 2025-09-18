import { getRedisConfig } from '#src/db/redis-interface.js';

describe('redis-interface getRedisConfig', () => {
  const env = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });
  afterEach(() => {
    process.env = env;
  });

  test('returns defaults when env vars not set', () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_USERNAME;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
    const cfg = getRedisConfig();
    expect(cfg.host).toBe('localhost');
    expect(cfg.port).toBe(6379);
    expect(cfg.db).toBe(0);
  });

  test('parses environment variables', () => {
    process.env.REDIS_HOST = 'redis.local';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_USERNAME = 'user';
    process.env.REDIS_PASSWORD = 'pass';
    process.env.REDIS_DB = '2';
    const cfg = getRedisConfig();
    expect(cfg.host).toBe('redis.local');
    expect(cfg.port).toBe(6380);
    expect(cfg.username).toBe('user');
    expect(cfg.password).toBe('pass');
    expect(cfg.db).toBe(2);
  });
});
