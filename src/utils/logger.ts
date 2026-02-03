/* eslint-disable @typescript-eslint/no-explicit-any */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.log(`[${this.context}] INFO:`, message, data || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] WARN:`, message, data || '');
  }

  error(message: string, data?: any): void {
    console.error(`[${this.context}] ERROR:`, message, data || '');
  }

  debug(message: string, data?: any): void {
    console.debug(`[${this.context}] DEBUG:`, message, data || '');
  }
}
