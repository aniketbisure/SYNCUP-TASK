import { Request, Response } from 'express';
import { Feed } from '../models/Feed.js';
import { getCache } from '../config/redis.js';

// Cache key for all feeds
const FEEDS_CACHE_KEY = 'feeds:all';
const CACHE_TTL_SECONDS = 60; // 1 minute cache TTL

/**
 * GET /api/feed
 * Retrieves all coaching feeds, utilizing Redis or fallback cache
 */
export const getFeeds = async (req: Request, res: Response): Promise<void> => {
  try {
    const cache = getCache();
    
    // Attempt to get data from cache
    let cachedData: string | null = null;
    try {
      cachedData = await cache.get(FEEDS_CACHE_KEY);
    } catch (cacheErr: any) {
      console.error('[Cache] Error getting from cache:', cacheErr.message || cacheErr);
    }

    if (cachedData) {
      console.log(`[Cache] HIT: Serving feeds from ${cache.isMock ? 'In-Memory Fallback' : 'Redis'} Cache.`);
      res.status(200).json({
        success: true,
        source: 'cache',
        count: JSON.parse(cachedData).length,
        data: JSON.parse(cachedData),
      });
      return;
    }

    console.log('[Cache] MISS: Querying MongoDB Atlas...');
    
    // Query database, sorted by newest first
    const feeds = await Feed.find().sort({ createdAt: -1 });

    // Cache the retrieved data
    try {
      await cache.setEx(FEEDS_CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(feeds));
      console.log(`[Cache] Cached ${feeds.length} feeds in ${cache.isMock ? 'In-Memory Fallback' : 'Redis'} (TTL: ${CACHE_TTL_SECONDS}s).`);
    } catch (cacheErr: any) {
      console.error('[Cache] Error saving to cache:', cacheErr.message || cacheErr);
    }

    res.status(200).json({
      success: true,
      source: 'database',
      count: feeds.length,
      data: feeds,
    });
  } catch (error: any) {
    console.error('[Feed Controller] Error in getFeeds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve coaching feeds',
      error: error.message,
    });
  }
};

/**
 * POST /api/feed
 * Creates a new coaching feed, invalidates the cache, and broadcasts via WebSockets
 */
export const createFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, category, coachName } = req.body;

    // Simple validation
    if (!title || !content || !category || !coachName) {
      res.status(400).json({
        success: false,
        message: 'All fields (title, content, category, coachName) are required',
      });
      return;
    }

    // Save to database
    const newFeed = new Feed({
      title,
      content,
      category,
      coachName,
    });
    
    await newFeed.save();
    console.log(`[Database] Inserted new feed: "${title}" by coach ${coachName}`);

    // Invalidate the cache to maintain consistency
    const cache = getCache();
    try {
      await cache.del(FEEDS_CACHE_KEY);
      console.log(`[Cache] Invalidated cache key: "${FEEDS_CACHE_KEY}" due to new post.`);
    } catch (cacheErr: any) {
      console.error('[Cache] Error invalidating cache:', cacheErr.message || cacheErr);
    }

    // Retrieve Socket.IO server attached to Express App and broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('feed:new', newFeed);
      console.log('[WebSocket] Broadcasted "feed:new" event with the new feed item.');
    } else {
      console.warn('[WebSocket] Warning: io instance not found on app, could not broadcast.');
    }

    res.status(201).json({
      success: true,
      message: 'Coaching feed created and broadcasted successfully',
      data: newFeed,
    });
  } catch (error: any) {
    console.error('[Feed Controller] Error in createFeed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coaching feed',
      error: error.message,
    });
  }
};
