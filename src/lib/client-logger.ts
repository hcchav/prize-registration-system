/**
 * Client-side logger that sends logs to the server-side logging API
 */

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Logger class for client-side logging
class ClientLogger {
  private apiEndpoint: string;
  private defaultMetadata: Record<string, any>;
  
  constructor(apiEndpoint: string = '/api/log') {
    this.apiEndpoint = apiEndpoint;
    this.defaultMetadata = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      clientTimestamp: new Date().toISOString(),
      source: 'client'
    };
  }
  
  // Generic log method
  private async log(level: LogLevel, message: string, metadata: Record<string, any> = {}) {
    try {
      const logData = {
        level,
        message,
        ...this.defaultMetadata,
        ...metadata
      };
      
      // Send log to server asynchronously
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData),
        // Don't wait for response to complete page navigation
        keepalive: true
      });
      
      // Optional: Handle response if needed
      if (!response.ok) {
        console.warn(`Failed to send log to server: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      // Fail silently in production, but log to console for debugging
      console.warn('Error sending log to server:', err);
    }
  }
  
  // Convenience methods for different log levels
  debug(message: string, metadata: Record<string, any> = {}) {
    this.log('debug', message, metadata);
    console.debug(message, metadata);
  }
  
  info(message: string, metadata: Record<string, any> = {}) {
    this.log('info', message, metadata);
    console.info(message, metadata);
  }
  
  warn(message: string, metadata: Record<string, any> = {}) {
    this.log('warn', message, metadata);
    console.warn(message, metadata);
  }
  
  error(message: string, metadata: Record<string, any> = {}) {
    this.log('error', message, metadata);
    console.error(message, metadata);
  }
}

// Create and export a singleton instance
const clientLogger = new ClientLogger();
export default clientLogger;
