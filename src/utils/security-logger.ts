export type SecurityEventType = 
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'POSITION_SIZE_EXCEEDED'
  | 'SECURITY_BLOCKED'
  | 'POSITION_EXECUTED'
  | 'EXECUTION_ERROR';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  userId?: string;
  request: any;
  response?: any;
  metadata?: Record<string, any>;
}

export class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents: number = 10000;

  logSecurityEvent(
    type: SecurityEventType,
    request: any,
    response?: any,
    metadata?: Record<string, any>
  ): void {
    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      userId: request?.userId,
      request,
      response,
      metadata
    };

    this.events.push(event);
    
    // Rotate events if we exceed max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
