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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- dependências são fornecidas pelos componentes consumidores.
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
