import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { JWTPayload, AuthUser } from '@/types';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded: JWTPayload = verifyToken(token);
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded: JWTPayload = verifyToken(token);
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    // Continue without user if token is invalid
  }

  next();
};