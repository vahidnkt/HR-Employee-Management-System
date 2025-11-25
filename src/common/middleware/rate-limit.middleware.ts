import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Global Rate Limiter
 * Prevents general DoS attacks
 * - Limit: 100 requests per 15 minutes
 * - Message: Too many requests, please try again later
 * - Skip: GET requests (view-only)
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for GET requests (read-only)
    return req.method === 'GET';
  },
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return (req.ip || req.connection.remoteAddress || '0.0.0.0') as string;
  },
});

/**
 * Login Rate Limiter
 * Prevents brute force attacks on login endpoint
 * - Limit: 5 login attempts per 5 minutes per IP
 * - After 5 attempts, user is blocked for 5 minutes
 */
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per IP per windowMs
  message:
    'Too many login attempts from this IP, please try again after 5 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests (when login fails)
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return (req.ip || req.connection.remoteAddress || '0.0.0.0') as string;
  },
});

/**
 * Register Rate Limiter
 * Prevents account creation spam
 * - Limit: 3 registration attempts per 1 hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per IP per hour
  message:
    'Too many accounts created from this IP, please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.ip || req.connection.remoteAddress || '0.0.0.0') as string;
  },
});

/**
 * Strict Rate Limiter for Sensitive Operations
 * For password reset, token refresh, etc.
 * - Limit: 10 attempts per 15 minutes per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  message:
    'Too many requests for this operation, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.ip || req.connection.remoteAddress || '0.0.0.0') as string;
  },
});
