export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async checkLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove expired requests
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
    
    if (validRequests.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    
    return true;
  }

  getRequestCount(userId: string): number {
    const now = Date.now();
<<<<<<< HEAD
    const userRequests = this.requests.get(userId) || [];
    return userRequests.filter(
      timestamp => now - timestamp < this.config.windowMs
    ).length;
  }

  reset(userId: string): void {
    this.requests.delete(userId);
  }
}
=======
>>>>>>> origin/main
