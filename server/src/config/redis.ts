import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Define the interface for our Caching Client
export interface CacheClient {
  get(key: string): Promise<string | null>;
  setEx(key: string, ttlSeconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  isMock: boolean;
}

// In-Memory Fallback Cache Implementation
class MemoryCache implements CacheClient {
  private cache = new Map<string, { value: string; expiresAt: number }>();
  public isMock = true;

  constructor() {
    console.log('[Cache] Initialized In-Memory Fallback Cache (TTL supported).');
    
    // Periodically clean up expired keys every 60 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000).unref();
  }

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

// Real Redis Wrapper Implementation
class RedisCache implements CacheClient {
  private client;
  public isMock = false;

  constructor(client: any) {
    this.client = client;
    console.log('[Cache] Using production-grade Redis Cache Client.');
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.client.setEx(key, ttlSeconds, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

let cacheClient: CacheClient;

export const connectCache = async (): Promise<CacheClient> => {
  if (cacheClient) return cacheClient;

  console.log(`[Cache] Attempting to connect to Redis at ${REDIS_URL}...`);
  const client = createClient({ url: REDIS_URL });

  // Suppress uncaught errors from redis client to prevent app crashing
  client.on('error', (err) => {
    // Just log connection errors quietly since we will fall back
    if (!cacheClient || cacheClient.isMock) return; 
    console.warn('[Cache] Redis Error encountered:', err.message);
  });

  try {
    // Set a connect timeout so it doesn't hang indefinitely on startup
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timed out after 3 seconds')), 3000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    
    // Connected successfully!
    cacheClient = new RedisCache(client);
    console.log('[Cache] Connected to Redis server successfully!');
  } catch (error: any) {
    console.warn(`[Cache] WARNING: Could not connect to Redis: ${error.message || error}`);
    console.warn('[Cache] Reverting to high-fidelity In-Memory Fallback Cache...');
    cacheClient = new MemoryCache();
    
    // Gracefully disconnect client if it was partially opened
    try {
      if (client.isOpen) {
        await client.disconnect();
      }
    } catch (e) {}
  }

  return cacheClient;
};

// Direct getter for importing elsewhere after initialization
export const getCache = (): CacheClient => {
  if (!cacheClient) {
    throw new Error('[Cache] Cache has not been initialized. Please call connectCache() first.');
  }
  return cacheClient;
};
