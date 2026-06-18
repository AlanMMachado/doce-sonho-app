import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export function useScreenData(
  loadFn: () => Promise<void>,
  deps: React.DependencyList = []
) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadFnRef = useRef(loadFn);
  loadFnRef.current = loadFn;

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFnRef.current().finally(() => setLoading(false));
    }, deps)
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFnRef.current();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { loading, refreshing, onRefresh };
}
