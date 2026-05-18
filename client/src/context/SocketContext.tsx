"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface SocketContextType {
  socket: Socket | null;
  status: ConnectionStatus;
  triggerReconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  status: 'disconnected',
  triggerReconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [reconnectCounter, setReconnectCounter] = useState(0);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    console.log(`[WebSocket] Connecting to backend at ${socketUrl}... (Attempt: ${reconnectCounter})`);
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    setSocket(socketInstance);
    setStatus('connecting');

    socketInstance.on('connect', () => {
      console.log(`[WebSocket] Successfully connected with ID: ${socketInstance.id}`);
      setStatus('connected');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[WebSocket] Disconnected: ${reason}`);
      setStatus('disconnected');
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('[WebSocket] Connection failed:', error.message);
      setStatus('disconnected');
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`[WebSocket] Reconnecting... Attempt #${attempt}`);
      setStatus('connecting');
    });

    return () => {
      console.log('[WebSocket] Cleaning up Socket.IO connection.');
      socketInstance.disconnect();
    };
  }, [reconnectCounter]);

  const triggerReconnect = () => {
    setReconnectCounter(prev => prev + 1);
  };

  return (
    <SocketContext.Provider value={{ socket, status, triggerReconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
