/**
 * Google OAuth Backend Token Exchange
 * Securely handles client_secret on server-side only
 */

import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for OAuth token exchange (max 10 requests per minute per IP)
const tokenExchangeLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many token exchange requests, please try again later.',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Request validation schema
const tokenExchangeSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Valid redirect URI is required'),
  clientId: z.string().min(1, 'Client ID is required')
});

/**
 * POST /api/auth/google/exchange-token
 * 
 * Exchanges Google OAuth authorization code for access tokens
 * This endpoint keeps client_secret secure on the backend
 */
router.post('/exchange-token', tokenExchangeLimit, async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log(`[${requestId}] Google token exchange request started`);
    
    // Validate request body
    const validation = tokenExchangeSchema.safeParse(req.body);
    if (!validation.success) {
      console.error(`[${requestId}] Validation failed:`, validation.error.errors);
      return res.status(400).json({
        error: 'Invalid request parameters',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors
      });
    }

    const { code, redirectUri, clientId } = validation.data;

    // Verify client ID matches environment (security check)
    const expectedClientId = process.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId !== expectedClientId) {
      console.error(`[${requestId}] Client ID mismatch: expected ${expectedClientId}, got ${clientId}`);
      return res.status(400).json({
        error: 'Invalid client ID',
        code: 'CLIENT_ID_MISMATCH'
      });
    }

    // Check if client secret is available
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      console.error(`[${requestId}] Google client secret not configured`);
      return res.status(500).json({
        error: 'OAuth configuration error',
        code: 'CONFIG_ERROR'
      });
    }

    console.log(`[${requestId}] Exchanging authorization code for tokens`);

    // Exchange authorization code for tokens with Google
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000 // 10 second timeout
    });

    const tokens = tokenResponse.data;
    
    console.log(`[${requestId}] Token exchange successful`, {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });

    // Return tokens to frontend (without logging sensitive data)
    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type || 'Bearer'
    });

  } catch (error) {
    console.error(`[${requestId}] Token exchange failed:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    // Handle specific Google API errors
    if (error.response?.status === 400 && error.response?.data?.error) {
      const googleError = error.response.data;
      return res.status(400).json({
        error: 'Google OAuth error',
        code: 'GOOGLE_OAUTH_ERROR',
        details: {
          error: googleError.error,
          error_description: googleError.error_description
        }
      });
    }

    // Handle network/timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: 'Unable to reach Google OAuth service',
        code: 'NETWORK_ERROR'
      });
    }

    // Generic error response (don't expose internal details)
    res.status(500).json({
      error: 'Token exchange failed',
      code: 'TOKEN_EXCHANGE_ERROR'
    });
  }
});

/**
 * POST /api/auth/google/refresh-token
 * 
 * Refreshes Google OAuth access token using refresh token
 */
router.post('/refresh-token', tokenExchangeLimit, async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);

  try {
    console.log(`[${requestId}] Google token refresh request started`);

    const { refresh_token, client_id } = req.body;

    if (!refresh_token || !client_id) {
      return res.status(400).json({
        error: 'Missing refresh_token or client_id',
        code: 'VALIDATION_ERROR'
      });
    }

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      console.error(`[${requestId}] Google client secret not configured`);
      return res.status(500).json({
        error: 'OAuth configuration error',
        code: 'CONFIG_ERROR'
      });
    }

    console.log(`[${requestId}] Refreshing access token`);

    // Refresh access token with Google
    const refreshResponse = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token: refresh_token,
      client_id: client_id,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const tokens = refreshResponse.data;
    
    console.log(`[${requestId}] Token refresh successful`);

    res.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope
    });

  } catch (error) {
    console.error(`[${requestId}] Token refresh failed:`, error.response?.data || error.message);

    if (error.response?.status === 400) {
      return res.status(400).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    res.status(500).json({
      error: 'Token refresh failed', 
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

export default router;