import { useCallback, useEffect, useRef, useState } from "react";

interface WSMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  const connect = useCallback(() => {
    if (!aliveRef.current) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!aliveRef.current) {
        ws.close();
        return;
      }
      setConnected(true);
      reconnectRef.current = 0;
    };

    ws.onmessage = (e) => {
      if (!aliveRef.current) return;
      try {
        const data = JSON.parse(e.data);
        setLastMessage(data);
      } catch {}
    };

    ws.onclose = () => {
      if (!aliveRef.current) return;
      setConnected(false);
      const delay = Math.min(1000 * 2 ** reconnectRef.current, 30000);
      reconnectRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    connect();
    return () => {
      aliveRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, lastMessage, send };
}
