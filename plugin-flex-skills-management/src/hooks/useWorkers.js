import { useState, useEffect, useCallback } from 'react';
import { fetchWorkers } from '../services/skillsService';

export const useWorkers = (getToken) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const data = await fetchWorkers(token);
      setWorkers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch workers';
      setError(message);
      console.error('useWorkers error:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  return {
    workers,
    loading,
    error,
    refetch: loadWorkers,
  };
};
