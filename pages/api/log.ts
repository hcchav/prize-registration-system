import { NextApiRequest, NextApiResponse } from 'next';
import logger, { logWithContext, sendDirectLog } from '@/lib/logger';

// BetterStack configuration
const BETTERSTACK_TOKEN = process.env.BETTERSTACK_TOKEN;
const BETTERSTACK_URL = process.env.BETTERSTACK_URL;

/**
 * API endpoint to receive client-side logs and forward them to BetterStack
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get log data from request body
    const { level, message, ...context } = req.body;

    // Validate required fields
    if (!level || !message) {
      return res.status(400).json({ error: 'Missing required fields: level, message' });
    }

    // Validate log level
    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: 'Invalid log level' });
    }

    // Add request metadata
    const enrichedContext = {
      ...context,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      referer: req.headers.referer || 'unknown',
      serverTimestamp: new Date().toISOString(),
    };

    // Log using the direct method that we know works
    await sendDirectLog(level, `[CLIENT] ${message}`, enrichedContext);

    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing client log:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
