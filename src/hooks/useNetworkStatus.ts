import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

interface NetworkStatus {
  isConnected: boolean;
  justReconnected: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;

      if (!connected) {
        wasOfflineRef.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setJustReconnected(false);
        setIsConnected(false);
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setIsConnected(true);
        setJustReconnected(true);
        timeoutRef.current = setTimeout(() => {
          setJustReconnected(false);
          timeoutRef.current = null;
        }, 3000);
      } else {
        setIsConnected(true);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isConnected, justReconnected };
}
