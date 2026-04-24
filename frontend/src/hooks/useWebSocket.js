import { useEffect, useRef, useCallback } from 'react';

export function useWebSocket(scanId, onMessage, onBulkLoad) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const seenIds = useRef(new Set());
  const isInitialLoad = useRef(true);

  const connect = useCallback(() => {
    if (!scanId) return;
    
    const ws = new WebSocket(`ws://localhost:8000/ws/${scanId}`);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const uniqueId = `${message.type}-${message.id || message.timestamp || JSON.stringify(message.data)}`;
        
        if (seenIds.current.has(uniqueId)) {
          return;
        }
        seenIds.current.add(uniqueId);
        
        if (isInitialLoad.current && message.type !== 'scan_info') {
          if (!onBulkLoad) {
            onMessage(message);
          }
        } else {
          onMessage(message);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
    
    ws.onclose = () => {
      console.log('⚠️ WebSocket disconnected, reconnecting...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  }, [scanId, onMessage, onBulkLoad]);

  useEffect(() => {
    isInitialLoad.current = true;
    seenIds.current.clear();
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return wsRef.current;
}