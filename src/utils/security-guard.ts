export interface UrlValidationResult {
  isValid: boolean;
  reason?: string;
}

export class SecurityGuard {
  // Reserved for future production domain whitelist
  private readonly _allowedDomains = [
    'localhost',
    '127.0.0.1',
    'snailer.app',
    'api.snailer.app'
  ];

  getAllowedDomains(): string[] {
    return [...this._allowedDomains];
  }

  private readonly BLOCKED_PROTOCOLS = [
    'file:',
    'ftp:',
    'javascript:',
    'data:'
  ];

  private readonly MAX_POSITION_SIZE = {
    low: 1000,
    medium: 10000,
    high: 100000
  };

  async validateUrl(url: string): Promise<UrlValidationResult> {
    try {
      const parsedUrl = new URL(url);
      
      // Check blocked protocols
      if (this.BLOCKED_PROTOCOLS.includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          reason: `Blocked protocol: ${parsedUrl.protocol}`
        };
      }

      // Note: Domain whitelist check disabled for now
      // In production, would validate against ALLOWED_DOMAINS

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        reason: 'Invalid URL format'
      };
    }
  }

  async validateRiskLevel(riskLevel: string, size: number): Promise<boolean> {
    if (!['low', 'medium', 'high'].includes(riskLevel)) {
      return false;
    }
    
    const maxSize = this.MAX_POSITION_SIZE[riskLevel as keyof typeof this.MAX_POSITION_SIZE];
    return size <= maxSize;
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    // Basic symbol validation - alphanumeric, 2-10 chars
    const symbolRegex = /^[A-Z]{2,10}$/;
    return symbolRegex.test(symbol.toUpperCase());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validatePositionSize(size: number, _symbol?: string): Promise<boolean> {
    // Check for reasonable position sizes
    if (size <= 0 || size > 1000000) {
      return false;
    }

    // Additional symbol-specific checks could go here
    return true;
  }

  sanitizeInput(input: string): string {
    return input.replace(/[<>"'&]/g, '');
  }

  async validateSize(size: number): Promise<boolean> {
    return size > 0 && size <= 1000000;
  }

  async validateEndpoint(endpoint: string): Promise<boolean> {
    if (endpoint.includes('localhost') || endpoint.match(/192\.168\.\d+\.\d+/)) {
      return false;
    }
    return true;
  }
}
