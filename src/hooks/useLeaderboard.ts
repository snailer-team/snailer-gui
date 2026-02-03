import { useState, useEffect, useCallback, useRef } from 'react';
import type { LeaderboardEntry, LeaderboardFilters } from '../types/leaderboard';

interface UseLeaderboardOptions extends LeaderboardFilters {
  refreshInterval?: number;
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const useLeaderboard = (options: UseLeaderboardOptions = {}): UseLeaderboardReturn => {
  const {
    timeframe = 'all',
    limit = 10,
    offset = 0,
    refreshInterval = 5000
  } = options;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await fetch(`${BACKEND_URL}/api/leaderboard?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEntries(data.entries);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [timeframe, limit, offset]);

  useEffect(() => {
    fetchLeaderboard();
    
    // Set up polling interval
    intervalRef.current = setInterval(fetchLeaderboard, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLeaderboard, refreshInterval]);

  return {
    entries,
    loading,
    error,
    lastUpdate,
    refresh: fetchLeaderboard
  };
};
