import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export function useScreenData(
  loadFn: () => Promise<void>,
  deps: React.DependencyList = []
) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const previousDepsRef = useRef<React.DependencyList | null>(null);
  const requestIdRef = useRef(0);
  const loadFnRef = useRef(loadFn);
  loadFnRef.current = loadFn;

  useFocusEffect(
    useCallback(() => {
      const dependenciesChanged =
        previousDepsRef.current === null ||
        previousDepsRef.current.length !== deps.length ||
        deps.some((dependency, index) => dependency !== previousDepsRef.current?.[index]);

      if (dependenciesChanged) {
        previousDepsRef.current = deps;
        hasLoadedRef.current = false;
      }

      if (!hasLoadedRef.current) {
        setLoading(true);
      }

      const requestId = ++requestIdRef.current;
      loadFnRef.current().finally(() => {
        if (requestId !== requestIdRef.current) return;
        hasLoadedRef.current = true;
        setLoading(false);
      });
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
