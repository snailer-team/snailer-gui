import React from 'react';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import type { LeaderboardEntry } from '../../types/leaderboard';

interface LeaderboardWidgetProps {
  className?: string;
  maxEntries?: number;
  refreshInterval?: number;
}

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  className = '',
  maxEntries = 10,
  refreshInterval = 5000
}) => {
  const { entries, loading, error, lastUpdate } = useLeaderboard({
    limit: maxEntries,
    refreshInterval
  });

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-700">Failed to load leaderboard: {error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Trading Leaderboard</h3>
        {lastUpdate && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        )}
      </div>
      
      <div className="p-4">
        {loading && entries.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <LeaderboardRow key={entry.userId} entry={entry} rank={index + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, rank }) => {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-500';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-400';
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
      <div className="flex items-center space-x-3">
        <span className={`font-bold text-lg ${getRankColor(rank)}`}>#{rank}</span>
        <span className="font-medium text-gray-900">{entry.username}</span>
      </div>
      <div className="text-right">
        <div className={`font-semibold ${entry.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {entry.totalReturn >= 0 ? '+' : ''}{(entry.totalReturn * 100).toFixed(2)}%
        </div>
        <div className="text-xs text-gray-500">{entry.trades} trades</div>
      </div>
    </div>
  );
};

export default LeaderboardWidget;
