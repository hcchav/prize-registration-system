import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import winston from 'winston';

// BetterStack configuration from environment variables
const BETTERSTACK_TOKEN = process.env.BETTERSTACK_SOURCE_TOKEN || '';
const BETTERSTACK_URL = process.env.BETTERSTACK_URL || 'https://s1373787.eu-nbg-2.betterstackdata.com/';

// Create transports array with console always included
const transports: winston.transport[] = [
  // Console transport for local development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
];

// Only add BetterStack if token is provided
if (BETTERSTACK_TOKEN) {
  // Initialize a new Logtail client with the provided token
  const logtail = new Logtail(BETTERSTACK_TOKEN, {
    endpoint: BETTERSTACK_URL
  });
  
  // Add Logtail transport
  transports.push(new LogtailTransport(logtail));
  console.log('BetterStack logging enabled');
} else {
  console.log('BetterStack logging disabled (no token provided)');
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'prize-registration' },
  transports
});

// Helper function to add request context to logs
export const logWithContext = (
  level: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly',
  message: string,
  context?: Record<string, any>
) => {
  logger.log(level, message, context);
};

// Direct log function that bypasses Winston and sends directly to BetterStack
export const sendDirectLog = async (
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  context?: Record<string, any>
) => {
  // Skip if no token is provided
  if (!BETTERSTACK_TOKEN) {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    return;
  }
  
  try {
    const logEntry = {
      dt: new Date().toISOString(),
      level,
      message,
      ...context
    };
    
    const response = await fetch(BETTERSTACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BETTERSTACK_TOKEN}`
      },
      body: JSON.stringify(logEntry)
    });
    
    if (response.status !== 202) {
      console.error(`Failed to send log to BetterStack: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error('Error sending direct log to BetterStack:', err);
  }
};

export default logger;
