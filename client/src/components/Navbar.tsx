"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { Radio, LayoutDashboard, UserCog, RefreshCw } from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();
  const { status, triggerReconnect } = useSocket();

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE SYSTEM</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wider animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
            <span>CONNECTING...</span>
          </div>
        );
      case 'disconnected':
      default:
        return (
          <button
            onClick={triggerReconnect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold tracking-wider hover:bg-rose-500/20 transition-all cursor-pointer group"
            title="Click to reconnect"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="group-hover:hidden">OFFLINE</span>
            <span className="hidden group-hover:flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> RECONNECT
            </span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand/Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-400">
            SYNC<span className="text-violet-400">UP</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5">
          <Link
            href="/"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 ${
              pathname === '/'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Coaching Feed</span>
          </Link>
          
          <Link
            href="/admin"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 ${
              pathname === '/admin'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
            }`}
          >
            <UserCog className="h-4 w-4" />
            <span>Coach Admin</span>
          </Link>
        </nav>

        {/* Status indicator */}
        <div className="flex items-center gap-4">
          {getStatusBadge()}
        </div>

      </div>
    </header>
  );
};
