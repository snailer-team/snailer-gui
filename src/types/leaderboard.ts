export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalReturn: number;
  trades: number;
  winRate: number;
  rank: number;
  lastUpdate: Date;
}

export interface LeaderboardFilters {
  timeframe?: 'day' | 'week' | 'month' | 'all';
  limit?: number;
  offset?: number;
}
