export interface UrlValidationResult {
  isValid: boolean;
  reason?: string;
}

export class SecurityGuard {
<<<<<<< HEAD
  // Reserved for future production domain whitelist
  private readonly _allowedDomains = [
=======
  private readonly ALLOWED_DOMAINS = [
>>>>>>> origin/main
    'localhost',
    '127.0.0.1',
    'snailer.app',
    'api.snailer.app'
  ];

<<<<<<< HEAD
  getAllowedDomains(): string[] {
    return [...this._allowedDomains];
  }

=======
>>>>>>> origin/main
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

<<<<<<< HEAD
      // Note: Domain whitelist check disabled for now
      // In production, would validate against ALLOWED_DOMAINS

      return { isValid: true };
    } catch {
=======
      // Check domain whitelist for production
      if (process.env.NODE_ENV === 'production') {
        const isAllowedDomain = this.ALLOWED_DOMAINS.some(domain => 
          parsedUrl.hostname === domain || 
          parsedUrl.hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowedDomain) {
          return {
            isValid: false,
            reason: `Domain not in whitelist: ${parsedUrl.hostname}`
          };
        }
      }

      return { isValid: true };
    } catch (error) {
>>>>>>> origin/main
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

<<<<<<< HEAD
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validatePositionSize(size: number, _symbol?: string): Promise<boolean> {
=======
  async validatePositionSize(size: number, symbol: string): Promise<boolean> {
>>>>>>> origin/main
    // Check for reasonable position sizes
    if (size <= 0 || size > 1000000) {
      return false;
    }

    // Additional symbol-specific checks could go here
    return true;
  }

  sanitizeInput(input: string): string {
    return input.replace(/[<>"'&]/g, '');
<<<<<<< HEAD
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
=======
>>>>>>> origin/main
