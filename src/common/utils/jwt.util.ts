import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtUtil {
  generateAccessToken(payload: any): string {
    const options: any = {
      expiresIn: process.env.JWT_EXPIRY || '15m',
      algorithm: 'HS256',
    };
    return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', options);
  }

  generateRefreshToken(payload: any): string {
    const options: any = {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      algorithm: 'HS256',
    };
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', options);
  }

  verifyToken(token: string, secret: string): any {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      return null;
    }
  }
}
