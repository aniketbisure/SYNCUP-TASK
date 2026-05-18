"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { 
  Search, 
  Filter, 
  RotateCw, 
  User, 
  Calendar, 
  CheckCircle2, 
  Database, 
  Zap, 
  Bell, 
  Flame, 
  Award,
  AlertTriangle,
  Sparkles,
  X
} from 'lucide-react';

interface FeedItem {
  _id: string;
  title: string;
  content: string;
  category: string;
  coachName: string;
  createdAt: string;
  isNewRealtime?: boolean; // temporary flag for entry animations
}

interface ToastItem {
  id: string;
  title: string;
  coachName: string;
  category: string;
}

const CATEGORIES = ['All', 'Mindset', 'Strategy', 'Tactics', 'Fitness'];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string; bullet: string }> = {
  mindset: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/5',
    bullet: 'bg-emerald-400'
  },
  strategy: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/5',
    bullet: 'bg-blue-400'
  },
  tactics: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-500/5',
    bullet: 'bg-purple-400'
  },
  fitness: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/5',
    bullet: 'bg-rose-400'
  },
};

const getCategoryStyle = (category: string) => {
  const norm = category.toLowerCase().trim();
  if (norm in CATEGORY_COLORS) return CATEGORY_COLORS[norm];
  return {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/20',
    glow: 'shadow-zinc-500/5',
    bullet: 'bg-zinc-400'
  };
};

const timeAgo = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function Home() {
  const { socket, status } = useSocket();
  
  // Data States
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter/Search States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Metrics & Source states
  const [sourceMetrics, setSourceMetrics] = useState<{ source: string; count: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic Toast System
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Ref to track IDs of already rendered feeds to prevent duplicate socket event prepending
  const renderedFeedIds = useRef<Set<string>>(new Set());

  // Main Fetch Feed API Handler
  const fetchFeeds = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/feed`;
      console.log(`[HTTP] Fetching coaching feeds from ${apiUrl}...`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server responded with HTTP ${response.status}`);
      }
      
      const resData = await response.json();
      
      if (resData.success && Array.isArray(resData.data)) {
        const dataList: FeedItem[] = resData.data;
        
        // Track IDs to prevent duplicate prepends from WebSockets later
        const idsSet = new Set<string>();
        dataList.forEach(item => idsSet.add(item._id));
        renderedFeedIds.current = idsSet;

        setFeeds(dataList);
        setSourceMetrics({
          source: resData.source || 'database',
          count: resData.count || dataList.length,
        });
      } else {
        throw new Error(resData.message || 'Malformed API response');
      }
    } catch (err: any) {
      console.error('[HTTP] Fetch Error:', err);
      setError(err.message || 'Could not connect to the backend server.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial Fetch on Mount
  useEffect(() => {
    fetchFeeds();
  }, []);

  // Handle Socket.IO connection status changes for Resync / Reconnection
  const previousStatusRef = useRef(status);
  useEffect(() => {
    // If the status transitions back to 'connected' after being disconnected/connecting,
    // sync feeds to capture any data posted while offline.
    if (previousStatusRef.current !== 'connected' && status === 'connected') {
      console.log('[WebSocket] Reconnected! Resynching coaching feeds list...');
      fetchFeeds();
    }
    previousStatusRef.current = status;
  }, [status]);

  // Handle Real-Time WebSockets Events
  useEffect(() => {
    if (!socket) return;

    const handleNewFeed = (newFeed: FeedItem) => {
      console.log('[WebSocket] Received "feed:new" event:', newFeed);

      // 1. Prevent Duplicate Events Check
      if (renderedFeedIds.current.has(newFeed._id)) {
        console.warn(`[WebSocket] Ignored duplicate feed event for ID: ${newFeed._id}`);
        return;
      }

      // Add to unique tracking set
      renderedFeedIds.current.add(newFeed._id);

      // 2. Prepend with temporary animation flag
      const animatedFeed = { ...newFeed, isNewRealtime: true };
      setFeeds(prev => [animatedFeed, ...prev]);

      // 3. Increment total count and update source metrics safely
      setSourceMetrics(prev => {
        if (!prev) return { source: 'database', count: 1 };
        return {
          ...prev,
          count: prev.count + 1
        };
      });

      // 4. Trigger premium glassmorphic Toast notification
      const toastId = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, {
        id: toastId,
        title: newFeed.title,
        coachName: newFeed.coachName,
        category: newFeed.category
      }]);

      // Auto-clear toast after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 4000);

      // Remove temporary entry-animation flag after 3 seconds
      setTimeout(() => {
        setFeeds(prev => 
          prev.map(f => f._id === newFeed._id ? { ...f, isNewRealtime: false } : f)
        );
      }, 3000);
    };

    socket.on('feed:new', handleNewFeed);

    return () => {
      socket.off('feed:new', handleNewFeed);
    };
  }, [socket]);

  // Remove individual Toast manually
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Filtered and Searched feeds
  const filteredFeeds = feeds.filter(feed => {
    const matchesCategory = selectedCategory === 'All' || feed.category.toLowerCase() === selectedCategory.toLowerCase();
    const searchString = `${feed.title} ${feed.content} ${feed.coachName}`.toLowerCase();
    const matchesSearch = searchString.includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8 relative overflow-hidden">
      
      {/* Dynamic Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
        {toasts.map(toast => {
          const style = getCategoryStyle(toast.category);
          return (
            <div 
              key={toast.id} 
              className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-lg shadow-xl shadow-black/40 animate-slide-in relative overflow-hidden group"
            >
              {/* Highlight bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bullet}`}></div>
              
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/10 shrink-0">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                    {toast.category}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">New update</span>
                </div>
                <h4 className="text-sm font-semibold text-white truncate">{toast.title}</h4>
                <p className="text-xs text-zinc-400">Published by Coach {toast.coachName}</p>
              </div>

              <button 
                onClick={() => removeToast(toast.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Header Dashboard Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">
              Coaching Workspace
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Realtime <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-200 to-white">Performance Feed</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Receive live, bite-sized strategies, mindset recalibrations, and tactical adjustments directly from your coaching board.
          </p>
        </div>

        {/* Real-time Cache Status Card */}
        {sourceMetrics && (
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md self-start md:self-auto min-w-[280px]">
            <div className={`flex items-center justify-center h-12 w-12 rounded-xl shrink-0 ${
              sourceMetrics.source === 'cache' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}>
              {sourceMetrics.source === 'cache' ? <Zap className="h-6 w-6" /> : <Database className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-0.5">
                ACTIVE DATA SOURCE
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white uppercase tracking-wide">
                  {sourceMetrics.source === 'cache' ? 'Redis / Memory Cache' : 'MongoDB Atlas'}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  sourceMetrics.source === 'cache' ? 'bg-amber-500/10 text-amber-300' : 'bg-indigo-500/10 text-indigo-300'
                }`}>
                  {sourceMetrics.source === 'cache' ? '60s TTL' : 'Direct'}
                </span>
              </div>
              <span className="text-xs text-zinc-400 block mt-0.5">
                Total cached records: {sourceMetrics.count}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel: Search & Categories */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-900/80 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search strategy, title, or coach name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all text-sm"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 justify-between lg:justify-end shrink-0">
            {/* Category selection header */}
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>FILTER</span>
            </div>

            {/* Reload button */}
            <button
              onClick={() => fetchFeeds(true)}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 disabled:opacity-50 transition-all text-xs font-medium tracking-wide cursor-pointer"
              title="Force Refresh cache bypass"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-violet-400' : ''}`} />
              <span>{isRefreshing ? 'REFRESHING...' : 'SYNC'}</span>
            </button>
          </div>

        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map(category => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wider uppercase shrink-0 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feed Container */}
      {loading ? (
        // Loading Skeleton Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-6 rounded-3xl bg-zinc-900/20 border border-zinc-800/40 animate-pulse flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 bg-zinc-800 rounded-lg"></div>
                <div className="h-4 w-12 bg-zinc-800 rounded-lg"></div>
              </div>
              <div className="h-6 w-3/4 bg-zinc-800 rounded-lg"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 w-full bg-zinc-800/60 rounded-md"></div>
                <div className="h-3 w-full bg-zinc-800/60 rounded-md"></div>
                <div className="h-3 w-5/6 bg-zinc-800/60 rounded-md"></div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-zinc-800"></div>
                  <div className="h-3 w-20 bg-zinc-800 rounded-md"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State Card
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-rose-500/5 border border-rose-500/10 text-center max-w-xl mx-auto my-10 gap-4 shadow-xl">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/15">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Backend Server Connection Lost</h3>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-md">
              We couldn't connect to the API server at <code className="text-rose-300 font-mono text-[10px] px-1 py-0.5 rounded bg-zinc-900">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}</code>. Make sure the Node.js backend is running.
            </p>
          </div>
          {error && (
            <div className="text-[11px] font-mono text-zinc-500 bg-black/40 p-2.5 rounded-xl border border-zinc-900 w-full max-w-sm truncate">
              Err: {error}
            </div>
          )}
          <button
            onClick={() => fetchFeeds()}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredFeeds.length === 0 ? (
        // Empty State Card
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-zinc-900/10 border border-zinc-900/60 text-center max-w-md mx-auto my-10 gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 text-zinc-500 border border-zinc-800">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">No Coaching Updates</h3>
            <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">
              No feed items match your filter criteria. Try selecting another category or check back soon for real-time posts!
            </p>
          </div>
          {(selectedCategory !== 'All' || search) && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearch('');
              }}
              className="px-4 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        // Feeds List Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeeds.map(feed => {
            const style = getCategoryStyle(feed.category);
            return (
              <article
                key={feed._id}
                className={`group flex flex-col p-6 rounded-3xl bg-zinc-900/20 hover:bg-zinc-900/40 border transition-all duration-300 relative overflow-hidden shadow-sm ${style.glow} hover:-translate-y-1 ${
                  feed.isNewRealtime 
                    ? 'border-emerald-500/80 shadow-emerald-500/10 ring-2 ring-emerald-500/20 scale-[1.02] bg-emerald-500/[0.02]' 
                    : 'border-zinc-800/80 hover:border-zinc-700/60'
                }`}
              >
                {/* Real-time Indicator Dot for new items */}
                {feed.isNewRealtime && (
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-emerald-500 animate-pulse"></div>
                )}

                {/* Card Category and Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${style.bg} ${style.text} ${style.border}`}>
                    {feed.category}
                  </span>
                  
                  <div className="flex items-center gap-1 text-zinc-500 group-hover:text-zinc-400 text-xs transition-colors">
                    <Calendar className="h-3.5 w-3.5" />
                    <time dateTime={feed.createdAt}>{timeAgo(feed.createdAt)}</time>
                  </div>
                </div>

                {/* Card Main Info */}
                <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-violet-300 transition-colors">
                  {feed.title}
                </h3>
                
                <p className="text-zinc-400 text-xs leading-relaxed flex-1 mb-6 break-words whitespace-pre-line font-medium">
                  {feed.content}
                </p>

                {/* Card Footer Coach Badge */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40 mt-auto">
                  <div className="flex items-center gap-2">
                    {/* User Avatar Circle */}
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700/80 text-violet-400 text-[10px] font-bold shadow-inner">
                      {feed.coachName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-zinc-300">
                      Coach {feed.coachName}
                    </span>
                  </div>

                  <span className="text-zinc-600 group-hover:text-violet-500/40 transition-colors">
                    <Flame className="h-4 w-4" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-72 h-72 rounded-full bg-violet-600/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 -z-10 w-96 h-96 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none"></div>

    </div>
  );
}
