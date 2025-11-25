import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RefreshTokens } from './auth.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    @Inject('REFRESH_TOKENS_REPOSITORY')
    private readonly refreshTokensRepository: typeof RefreshTokens,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user (password hashing is done in UsersService.create())
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.getExpirySeconds(process.env.JWT_EXPIRY || '15m'),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      // Increment failed attempts
      await user.increment('failedLoginAttempts');

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        await user.update({ lockedUntil: lockUntil });
        throw new UnauthorizedException('Account locked due to too many failed attempts');
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Account is locked. Try again later');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Reset failed attempts on successful login
    await user.update({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.getExpirySeconds(process.env.JWT_EXPIRY || '15m'),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshTokenDto: RefreshTokenDto): Promise<any> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if refresh token is stored and not revoked
      const storedToken = await this.refreshTokensRepository.findOne({
        where: {
          token: refreshTokenDto.refreshToken,
          userId: payload.sub,
          isRevoked: false,
        },
      });

      if (!storedToken || new Date() > new Date(storedToken.expiresAt)) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      // Get user
      const user = await this.usersService.findById(payload.sub);

      // Generate new access token
      const accessTokenOptions: any = {
        expiresIn: process.env.JWT_EXPIRY || '15m',
        algorithm: 'HS256',
      };

      const accessToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          roles: user.role,
        },
        process.env.JWT_SECRET || 'dev-secret',
        accessTokenOptions,
      );

      return {
        accessToken,
        expiresIn: this.getExpirySeconds(process.env.JWT_EXPIRY || '15m'),
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Revoke refresh token
    await this.refreshTokensRepository.update(
      { isRevoked: true, revokedReason: 'logout' },
      {
        where: {
          userId,
          token: refreshToken,
        },
      },
    );
  }

  private generateTokens(
    userId: string,
    email: string,
    role: string,
  ): { accessToken: string; refreshToken: string } {
    const accessTokenOptions: any = {
      expiresIn: process.env.JWT_EXPIRY || '15m',
      algorithm: 'HS256',
    };

    const accessToken = jwt.sign(
      {
        sub: userId,
        email,
        roles: role,
      },
      process.env.JWT_SECRET || 'dev-secret',
      accessTokenOptions,
    );

    const refreshTokenOptions: any = {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      algorithm: 'HS256',
    };

    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      refreshTokenOptions,
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + this.convertExpiryToMs(process.env.JWT_REFRESH_EXPIRY || '7d'),
    );

    await this.refreshTokensRepository.create({
      userId,
      token,
      expiresAt,
    });
  }

  private convertExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)(m|h|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60 * 1000; // minutes
      case 'h':
        return value * 60 * 60 * 1000; // hours
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private getExpirySeconds(expiry: string): number {
    return Math.floor(this.convertExpiryToMs(expiry) / 1000);
  }
}
