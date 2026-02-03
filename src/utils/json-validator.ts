/* eslint-disable @typescript-eslint/no-explicit-any, no-control-regex */
export class JsonValidator {
  validateAndFix(data: any): any {
    try {
      // If it's already an object, validate structure
      if (typeof data === 'object' && data !== null) {
        return this.sanitizeObject(data);
      }

      // If it's a string, try to parse as JSON
      if (typeof data === 'string') {
        const trimmed = data.trim();

        // Fix common JSON issues
        const fixed = this.fixCommonJsonIssues(trimmed);

        try {
          const parsed = JSON.parse(fixed);
          return this.sanitizeObject(parsed);
        } catch {
          // If still invalid, wrap in object
          return { raw: data, valid: false };
        }
      }

      return data;
    } catch {
      return { error: 'JSON validation failed', raw: data };
    }
  }

  private fixCommonJsonIssues(jsonString: string): string {
    return jsonString
      // Remove trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Ensure proper closing
      .replace(/,\s*$/, '');
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  validateSchema(schema: any): boolean {
    // Basic schema validation - could be extended with JSON Schema
    return typeof schema === 'object' && schema !== null;
  }
}
